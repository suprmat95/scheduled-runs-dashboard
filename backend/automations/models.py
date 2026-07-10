from functools import lru_cache

from croniter import croniter
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

try:
    from cron_descriptor import Options, get_description

    # Force english so the rendered text is consistent regardless of the
    # server's environment (otherwise cron_descriptor auto-detects and can mix
    # languages, e.g. "Alle 09:00, solo il Monday").
    _CRON_OPTS = Options()
    _CRON_OPTS.locale_code = "en_US"
except ImportError:  # cron_descriptor is optional (nice-to-have display)
    get_description = None
    _CRON_OPTS = None


@lru_cache(maxsize=512)
def describe_crontab(crontab):
    """Human-readable rendering of a crontab, e.g. 'At 09:00, only on Monday'.

    Memoized because it's a pure function of the crontab string: cron_descriptor
    is re-run only once per distinct expression instead of on every serialization
    of every row. The cache can never go stale — the output depends solely on the
    input — so no invalidation is needed. Bounded size caps memory if many
    distinct expressions are seen over a long-running process.
    """
    if get_description is None:
        return crontab
    try:
        return get_description(crontab, _CRON_OPTS)
    except Exception:
        return crontab


def validate_crontab(value):
    """Ensure the value is a valid 5-field crontab expression (Celery Beat style)."""
    if not croniter.is_valid(value):
        raise ValidationError(
            f"'{value}' is not a valid crontab expression "
            "(expected 5 fields: minute hour day-of-month month day-of-week)."
        )


class Automation(models.Model):
    """A scheduled automation (Zapier-style), scheduled via a crontab expression.

    Built to stay fast at high row counts: the fields the dashboard filters and
    sorts on — `next_run` and `last_run` — are *denormalized* onto the row
    (instead of being recomputed from the runs table or the crontab on every
    request). This trades a little write-time work for indexed, N+1-free reads:

      - `next_run_at`  is recomputed from the crontab on `save()`.
      - `last_run_at` / `last_run_status` are kept in sync by signals whenever an
        AutomationRun is created/updated/deleted (see signals.py).
    """

    name = models.CharField(max_length=200)
    # Celery Beat / cron style: "minute hour day-of-month month day-of-week"
    # e.g. "0 9 * * *" (daily at 09:00), "0 12 16 * *" (12:00 on the 16th).
    crontab = models.CharField(
        max_length=100,
        default="0 0 * * *",
        validators=[validate_crontab],
        help_text='Crontab expression, e.g. "0 9 * * 1" for every Monday at 09:00.',
    )
    active = models.BooleanField(default=True, db_index=True)
    start_date = models.DateTimeField(default=timezone.now)

    # --- denormalized, indexed columns for fast listing / filtering / sorting ---
    next_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_run_at = models.DateTimeField(null=True, blank=True, db_index=True)
    last_run_status = models.CharField(
        max_length=20, null=True, blank=True, db_index=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    # ------------------------------------------------------------------ display
    @property
    def schedule_display(self):
        """Human-readable schedule, e.g. 'At 09:00, only on Monday'."""
        return describe_crontab(self.crontab)

    # ------------------------------------------------------- denormalization ---
    def compute_next_run(self):
        """Next scheduled firing from the crontab, or None when inactive."""
        if not self.active:
            return None
        now = timezone.now()
        return croniter(self.crontab, now).get_next(type(now))

    def save(self, *args, **kwargs):
        # Recompute the crontab-derived field on every save. last_run_* is owned
        # by sync_last_run() (signal-driven), so it's read as-is here.
        self.next_run_at = self.compute_next_run()
        super().save(*args, **kwargs)

    def sync_last_run(self):
        """Refresh the denormalized last-run columns from the runs table.

        Called by signals when this automation's runs change. Uses a narrow
        `update_fields` save so it never recurses into next_run recomputation.
        """
        latest = self.runs.order_by("-ran_at").first()
        self.last_run_at = latest.ran_at if latest else None
        self.last_run_status = latest.status if latest else None
        super().save(
            update_fields=[
                "last_run_at",
                "last_run_status",
                "updated_at",
            ]
        )


class AutomationRun(models.Model):
    """A single execution of an automation — the execution history."""

    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    automation = models.ForeignKey(
        Automation, related_name="runs", on_delete=models.CASCADE
    )
    ran_at = models.DateTimeField(default=timezone.now, db_index=True)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUCCESS
    )

    class Meta:
        ordering = ["-ran_at"]

    def __str__(self):
        return f"{self.automation.name} @ {self.ran_at:%Y-%m-%d %H:%M} ({self.status})"
