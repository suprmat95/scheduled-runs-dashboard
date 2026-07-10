"""Populate the database with mockup-coherent placeholder data.

Usage:  python manage.py seed
"""
from datetime import time

from croniter import croniter
from django.core.management.base import BaseCommand
from django.utils import timezone

from automations.models import Automation, AutomationRun

S = AutomationRun.Status

# (name, crontab, active)  — crontab: "minute hour day-of-month month day-of-week"
AUTOMATIONS = [
    ("Backup Database", "0 23 * * *", True),    # daily at 23:00
    ("Daily Data Sync", "0 0 * * *", True),     # daily at 00:00
    ("Email newsletter", "0 9 * * *", True),    # daily at 09:00
    ("Weekly Report", "0 9 * * 1", True),       # every Monday at 09:00
    ("Customer Survey", "0 12 16 * *", False),  # 12:00 on the 16th
]

# Yesterday's run outcomes (from the mockup's "Yesterday's Runs" panel).
YESTERDAY = {
    "Backup Database": (time(23, 0), S.SUCCESS),
    "Daily Data Sync": (time(0, 0), S.SUCCESS),
    "Email newsletter": (time(9, 0), S.SUCCESS),
    "Weekly Report": (time(9, 0), S.FAILED),
}


class Command(BaseCommand):
    help = "Seed the DB with mockup-coherent automations and runs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Skip seeding when the DB already has automations. Used on "
            "container startup so an existing (e.g. reviewer-populated) DB "
            "isn't wiped on every `docker compose up`.",
        )

    def handle(self, *args, **options):
        if options["if_empty"] and Automation.objects.exists():
            self.stdout.write("DB already populated; skipping seed.")
            return

        AutomationRun.objects.all().delete()
        Automation.objects.all().delete()

        now = timezone.now()
        yesterday = timezone.localdate() - timezone.timedelta(days=1)

        for name, crontab, active in AUTOMATIONS:
            # save() fills next_run_at from the crontab; creating the run below
            # fires the signal that fills last_run_at / last_run_status.
            automation = Automation.objects.create(
                name=name,
                crontab=crontab,
                active=active,
                start_date=now - timezone.timedelta(days=30),
            )

            if name in YESTERDAY:
                run_time, status = YESTERDAY[name]
                AutomationRun.objects.create(
                    automation=automation,
                    ran_at=timezone.make_aware(
                        timezone.datetime.combine(yesterday, run_time)
                    ),
                    status=status,
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {Automation.objects.count()} automations and "
                f"{AutomationRun.objects.count()} runs."
            )
        )
