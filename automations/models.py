from croniter import croniter
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

try:
    from cron_descriptor import get_description
except ImportError:  # cron_descriptor is optional (nice-to-have display)
    get_description = None


def validate_crontab(value):
    """Ensure the value is a valid 5-field crontab expression (Celery Beat style)."""
    if not croniter.is_valid(value):
        raise ValidationError(
            f"'{value}' is not a valid crontab expression "
            "(expected 5 fields: minute hour day-of-month month day-of-week)."
        )


class Automation(models.Model):
    """A scheduled automation (Zapier-style), scheduled via a crontab expression."""

    name = models.CharField(max_length=200)
    # Celery Beat / cron style: "minute hour day-of-month month day-of-week"
    # e.g. "0 9 * * *" (daily at 09:00), "0 12 16 * *" (12:00 on the 16th).
    crontab = models.CharField(
        max_length=100,
        default="0 0 * * *",
        validators=[validate_crontab],
        help_text='Crontab expression, e.g. "0 9 * * 1" for every Monday at 09:00.',
    )
    active = models.BooleanField(default=True)
    start_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def schedule_display(self):
        """Human-readable schedule, e.g. 'At 09:00, only on Monday'."""
        if get_description is not None:
            try:
                return get_description(self.crontab)
            except Exception:
                pass
        return self.crontab

    @property
    def next_run(self):
        """Next scheduled run, computed on the fly from the crontab.

        Derived (not stored) so it's always fresh — no scheduler needed to keep
        a DB column in sync. Returns None when the automation is inactive.
        """
        if not self.active:
            return None
        now = timezone.now()
        return croniter(self.crontab, now).get_next(type(now))

    @property
    def last_run(self):
        """Most recent run for this automation, or None."""
        return self.runs.order_by("-ran_at").first()


class AutomationRun(models.Model):
    """A single execution of an automation — the execution history."""

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    automation = models.ForeignKey(
        Automation, related_name="runs", on_delete=models.CASCADE
    )
    ran_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUCCESS
    )

    class Meta:
        ordering = ["-ran_at"]

    def __str__(self):
        return f"{self.automation.name} @ {self.ran_at:%Y-%m-%d %H:%M} ({self.status})"
