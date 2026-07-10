from datetime import datetime, timedelta

from croniter import croniter_range
from django.core.cache import cache
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import Automation, AutomationRun
from .serializers import AutomationRunSerializer, AutomationSerializer


def _first_firing_in_window(auto_cron, start, end):
    """First datetime in [start, end) at which `auto_cron` fires, or None.

    Uses croniter's built-in range iterator over the automation's own firing
    times (few per day), so it's cheap.
    """
    for fires_at in croniter_range(start, end, auto_cron, exclude_ends=False):
        if fires_at >= end:  # croniter_range is inclusive of `end`
            break
        return fires_at
    return None


def _parse_bool(value):
    """Parse a query-param boolean, or None if it isn't a recognised value."""
    lowered = value.strip().lower()
    if lowered in ("true", "1", "yes"):
        return True
    if lowered in ("false", "0", "no"):
        return False
    return None


class AutomationViewSet(viewsets.ModelViewSet):
    """Full CRUD for automations, plus KPIs and run-recording endpoints.

    Reads are built for high row counts: the list is paginated (settings.py),
    filtering is done on indexed columns, and the KPIs are one aggregate query.
    """

    queryset = Automation.objects.all()
    serializer_class = AutomationSerializer

    # `?ordering=` over the columns below.
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["name", "next_run_at", "last_run_at", "active"]
    ordering = ["name"]

    def get_queryset(self):
        """List automations, optionally filtered by query params.

        Supported filters (used by the frontend's KPI-box interactions):
          - active=true|false               -> only active / inactive automations
          - last_run_status=success|failed  -> filter on the most recent run's status

        Both are now plain indexed-column lookups: `active` is a real field, and
        `last_run_status` is denormalized onto the row (kept in sync by signals),
        so neither needs a join or a correlated subquery.
        """
        qs = super().get_queryset()

        active_raw = self.request.query_params.get("active")
        if active_raw is not None:
            active = _parse_bool(active_raw)
            if active is None:
                raise ValidationError(
                    {"active": ["Expected a boolean: true/false."]}
                )
            qs = qs.filter(active=active)

        status_raw = self.request.query_params.get("last_run_status")
        if status_raw is not None:
            valid = {s.value for s in AutomationRun.Status}
            if status_raw not in valid:
                raise ValidationError(
                    {"last_run_status": [f"Expected one of: {', '.join(sorted(valid))}."]}
                )
            qs = qs.filter(last_run_status=status_raw)

        return qs

    @action(detail=False, methods=["get"])
    def kpis(self, request):
        """Summary KPIs: total, active, and success rate over last runs.

        All three come from one aggregate query, so they're cached together as a
        single entry (cleared on any Automation/AutomationRun write via signals).
        Caching here is marginal — the query is already O(1) in Python — but it
        applies the pattern consistently and removes the query under high read
        volume.
        """
        payload = cache.get_or_set("automations:kpis", self._compute_kpis)
        return Response(payload)

    def _compute_kpis(self):
        """Build the KPI payload (the cache-miss path)."""
        agg = Automation.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(active=True)),
            successful=Count(
                "id", filter=Q(last_run_status=AutomationRun.Status.SUCCESS)
            ),
            with_runs=Count("id", filter=Q(last_run_status__isnull=False)),
        )
        rate = (
            round(agg["successful"] / agg["with_runs"] * 100)
            if agg["with_runs"]
            else 0
        )
        return {
            "total_automations": agg["total"],
            "active_schedules": agg["active"],
            "success_rate": rate,
        }

    @action(detail=False, methods=["get"])
    def matching(self, request):
        """Return the active automations scheduled to run on a given day.

        Param:
          - date: ISO date (YYYY-MM-DD). Defaults to today.

        Each result is annotated with `matched_at`, the automation's first firing
        time on that day.

        Examples:
          - (no param)        -> automations running today
          - ?date=2026-07-07  -> automations running on July 7th
        """
        # --- resolve the target day ---
        date_raw = request.query_params.get("date")
        if date_raw:
            day = parse_date(date_raw)
            if day is None:
                return Response(
                    {"date": ["Invalid date, expected format YYYY-MM-DD."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            day = timezone.localdate()

        # Recomputing the per-day firing times (croniter over every active
        # automation) is the priciest read here, and the result is identical for
        # every visitor until an automation changes. Cache it per date; any
        # Automation/AutomationRun write clears the cache (signals).
        key = f"automations:matching:{day.isoformat()}"
        payload = cache.get_or_set(key, lambda: self._compute_matching(day))
        return Response(payload)

    def _compute_matching(self, day):
        """Build the matching payload for `day` (the cache-miss path)."""
        start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
        end = start + timedelta(days=1)

        results = []
        for automation in Automation.objects.filter(active=True):
            fires_at = _first_firing_in_window(automation.crontab, start, end)
            if fires_at is not None:
                item = AutomationSerializer(automation).data
                item["matched_at"] = fires_at
                results.append(item)

        results.sort(key=lambda i: i["matched_at"])
        return {"date": day, "count": len(results), "results": results}

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        """Record an execution of this automation.

        Creating the run fires the signal that refreshes the automation's
        denormalized last-run columns, so no manual update is needed here.
        """
        automation = self.get_object()
        run_status = request.data.get("status", AutomationRun.Status.SUCCESS)
        run = AutomationRun.objects.create(automation=automation, status=run_status)
        return Response(AutomationRunSerializer(run).data, status=201)


class AutomationRunViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to run history, optionally filtered by date."""

    serializer_class = AutomationRunSerializer

    def get_queryset(self):
        qs = AutomationRun.objects.select_related("automation").all()
        date_raw = self.request.query_params.get("date")
        if date_raw:
            day = parse_date(date_raw)
            if day is None:
                raise ValidationError(
                    {"date": ["Invalid date, expected format YYYY-MM-DD."]}
                )
            qs = qs.filter(ran_at__date=day)
        return qs
