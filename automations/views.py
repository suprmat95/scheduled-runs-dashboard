from datetime import datetime, timedelta

from croniter import croniter_range
from django.db.models import OuterRef, Subquery
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status, viewsets
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
    """Full CRUD for automations, plus KPIs and run-recording endpoints."""

    queryset = Automation.objects.all()
    serializer_class = AutomationSerializer

    def get_queryset(self):
        """List automations, optionally filtered by query params.

        Supported filters (used by the frontend's KPI-box interactions):
          - active=true|false               -> only active / inactive automations
          - last_run_status=success|failed  -> filter on the most recent run's status

        Why this is hand-rolled instead of DjangoFilterBackend/filterset_fields:
        the two filters are not the same kind of thing.

          - `active` IS a real model field, so the filtering itself is just the
            ORM's `.filter(active=...)`. The only extra work is parsing the query
            param: everything in the URL arrives as a string ("?active=false"
            gives the string "false", which is truthy in Python), so we convert it
            to a real bool before filtering.

          - `last_run_status` is NOT a model field. It's derived — the status of
            the latest related AutomationRun — so `.filter(last_run_status=...)`
            can't work (no such column). We resolve it with a correlated subquery
            that pulls the most recent run's status per automation, keeping the
            filter at the DB level instead of loading rows into Python.

        Since `last_run_status` needs custom logic regardless, both filters live
        here together rather than splitting them across an extra dependency
        (django-filter) for one and custom code for the other.
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
            latest_status = (
                AutomationRun.objects.filter(automation=OuterRef("pk"))
                .order_by("-ran_at")
                .values("status")[:1]
            )
            qs = qs.annotate(_last_run_status=Subquery(latest_status)).filter(
                _last_run_status=status_raw
            )

        return qs

    @action(detail=False, methods=["get"])
    def kpis(self, request):
        """Summary KPIs: total, active, and success rate over last runs."""
        automations = list(Automation.objects.all())
        total = len(automations)
        active = sum(1 for a in automations if a.active)

        last_runs = [a.last_run for a in automations if a.last_run is not None]
        successful = sum(
            1 for r in last_runs if r.status == AutomationRun.Status.SUCCESS
        )
        rate = round(successful / len(last_runs) * 100) if last_runs else 0

        return Response(
            {
                "total_automations": total,
                "active_schedules": active,
                "success_rate": rate,
            }
        )

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

        start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
        end = start + timedelta(days=1)

        # --- collect automations firing that day ---
        results = []
        for automation in Automation.objects.filter(active=True):
            fires_at = _first_firing_in_window(automation.crontab, start, end)
            if fires_at is not None:
                item = AutomationSerializer(automation).data
                item["matched_at"] = fires_at
                results.append(item)

        results.sort(key=lambda i: i["matched_at"])
        return Response({"date": day, "count": len(results), "results": results})

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        """Record an execution of this automation."""
        automation = self.get_object()
        status = request.data.get("status", AutomationRun.Status.SUCCESS)
        run = AutomationRun.objects.create(automation=automation, status=status)
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
