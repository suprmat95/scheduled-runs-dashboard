from datetime import datetime, timedelta

from croniter import croniter_range
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


class AutomationViewSet(viewsets.ModelViewSet):
    """Full CRUD for automations, plus KPIs and run-recording endpoints."""

    queryset = Automation.objects.all()
    serializer_class = AutomationSerializer

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
