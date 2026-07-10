from django.test import TestCase
from django.utils import timezone

from automations.models import Automation, AutomationRun


class DenormalizedLastRunTests(TestCase):
    """The signals in signals.py keep last_run_* in sync with the runs table."""

    def setUp(self):
        self.auto = Automation.objects.create(name="Sync", crontab="0 0 * * *")

    def test_creating_run_updates_last_run(self):
        self.assertIsNone(self.auto.last_run_at)
        AutomationRun.objects.create(
            automation=self.auto, status=AutomationRun.Status.SUCCESS
        )
        self.auto.refresh_from_db()
        self.assertEqual(self.auto.last_run_status, "success")
        self.assertIsNotNone(self.auto.last_run_at)

    def test_latest_run_wins(self):
        now = timezone.now()
        AutomationRun.objects.create(
            automation=self.auto,
            status=AutomationRun.Status.SUCCESS,
            ran_at=now - timezone.timedelta(hours=2),
        )
        AutomationRun.objects.create(
            automation=self.auto,
            status=AutomationRun.Status.FAILED,
            ran_at=now,
        )
        self.auto.refresh_from_db()
        self.assertEqual(self.auto.last_run_status, "failed")

    def test_deleting_latest_run_reverts_to_previous(self):
        now = timezone.now()
        AutomationRun.objects.create(
            automation=self.auto,
            status=AutomationRun.Status.SUCCESS,
            ran_at=now - timezone.timedelta(hours=2),
        )
        latest = AutomationRun.objects.create(
            automation=self.auto,
            status=AutomationRun.Status.FAILED,
            ran_at=now,
        )
        latest.delete()
        self.auto.refresh_from_db()
        self.assertEqual(self.auto.last_run_status, "success")

    def test_deleting_only_run_clears_last_run(self):
        run = AutomationRun.objects.create(
            automation=self.auto, status=AutomationRun.Status.SUCCESS
        )
        run.delete()
        self.auto.refresh_from_db()
        self.assertIsNone(self.auto.last_run_status)
        self.assertIsNone(self.auto.last_run_at)
