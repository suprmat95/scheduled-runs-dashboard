from django.core.exceptions import ValidationError
from django.test import TestCase

from automations.models import Automation, validate_crontab


class ValidateCrontabTests(TestCase):
    def test_accepts_valid_expression(self):
        # Should not raise.
        validate_crontab("0 9 * * 1")

    def test_rejects_wrong_field_count(self):
        with self.assertRaises(ValidationError):
            validate_crontab("0 9 * *")

    def test_rejects_garbage(self):
        with self.assertRaises(ValidationError):
            validate_crontab("not a crontab")


class ScheduleDisplayTests(TestCase):
    def test_renders_human_readable_text(self):
        auto = Automation(name="Weekly Report", crontab="0 9 * * 1")
        # Forced en_US locale -> "At 09:00, only on Monday".
        self.assertIn("Monday", auto.schedule_display)
        self.assertNotEqual(auto.schedule_display, auto.crontab)


class NextRunTests(TestCase):
    def test_save_computes_next_run_for_active(self):
        auto = Automation.objects.create(name="Daily", crontab="0 9 * * *")
        self.assertIsNotNone(auto.next_run_at)

    def test_inactive_has_no_next_run(self):
        auto = Automation.objects.create(
            name="Off", crontab="0 9 * * *", active=False
        )
        self.assertIsNone(auto.next_run_at)

    def test_next_run_recomputed_on_save(self):
        auto = Automation.objects.create(name="Daily", crontab="0 9 * * *")
        first = auto.next_run_at
        auto.crontab = "0 10 * * *"
        auto.save()
        self.assertNotEqual(auto.next_run_at, first)
