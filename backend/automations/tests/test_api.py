from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from automations.models import Automation, AutomationRun


class AutomationApiTests(APITestCase):
    def setUp(self):
        # Endpoints cache; isolate each test from cached payloads.
        cache.clear()

    # --- create / read / update / delete -------------------------------------
    def test_create_sets_derived_fields(self):
        resp = self.client.post(
            "/api/automations/",
            {"name": "Daily Sync", "crontab": "0 9 * * *", "active": True},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIn("09:00", resp.data["schedule_display"])
        self.assertIsNotNone(resp.data["next_run_at"])

    def test_create_rejects_invalid_crontab(self):
        resp = self.client.post(
            "/api/automations/",
            {"name": "Bad", "crontab": "nope"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("crontab", resp.data)

    def test_list_is_paginated(self):
        Automation.objects.create(name="A", crontab="0 0 * * *")
        resp = self.client.get("/api/automations/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.data)
        self.assertIn("count", resp.data)

    def test_update_recomputes_schedule_display(self):
        auto = Automation.objects.create(name="A", crontab="0 9 * * *")
        resp = self.client.patch(
            f"/api/automations/{auto.id}/",
            {"crontab": "0 9 * * 1"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("Monday", resp.data["schedule_display"])

    def test_delete(self):
        auto = Automation.objects.create(name="A", crontab="0 0 * * *")
        resp = self.client.delete(f"/api/automations/{auto.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Automation.objects.filter(id=auto.id).exists())

    # --- filters -------------------------------------------------------------
    def test_filter_active(self):
        Automation.objects.create(name="On", crontab="0 0 * * *", active=True)
        Automation.objects.create(name="Off", crontab="0 0 * * *", active=False)
        resp = self.client.get("/api/automations/?active=false")
        names = [a["name"] for a in resp.data["results"]]
        self.assertEqual(names, ["Off"])

    def test_filter_last_run_status(self):
        a = Automation.objects.create(name="A", crontab="0 0 * * *")
        b = Automation.objects.create(name="B", crontab="0 0 * * *")
        AutomationRun.objects.create(automation=a, status="success")
        AutomationRun.objects.create(automation=b, status="failed")
        resp = self.client.get("/api/automations/?last_run_status=failed")
        names = [x["name"] for x in resp.data["results"]]
        self.assertEqual(names, ["B"])

    def test_filter_active_rejects_garbage(self):
        resp = self.client.get("/api/automations/?active=maybe")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # --- kpis ----------------------------------------------------------------
    def test_kpis(self):
        a = Automation.objects.create(name="A", crontab="0 0 * * *", active=True)
        Automation.objects.create(name="B", crontab="0 0 * * *", active=False)
        AutomationRun.objects.create(automation=a, status="success")
        resp = self.client.get("/api/automations/kpis/")
        self.assertEqual(resp.data["total_automations"], 2)
        self.assertEqual(resp.data["active_schedules"], 1)
        self.assertEqual(resp.data["success_rate"], 100)

    # --- matching ------------------------------------------------------------
    def test_matching_includes_scheduled_active(self):
        Automation.objects.create(name="Daily", crontab="0 9 * * *", active=True)
        today = timezone.localdate().isoformat()
        resp = self.client.get(f"/api/automations/matching/?date={today}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [a["name"] for a in resp.data["results"]]
        self.assertIn("Daily", names)
        self.assertTrue(all("matched_at" in a for a in resp.data["results"]))

    def test_matching_excludes_inactive(self):
        Automation.objects.create(name="Off", crontab="0 9 * * *", active=False)
        resp = self.client.get("/api/automations/matching/")
        names = [a["name"] for a in resp.data["results"]]
        self.assertNotIn("Off", names)

    def test_matching_rejects_bad_date(self):
        resp = self.client.get("/api/automations/matching/?date=not-a-date")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # --- run endpoint --------------------------------------------------------
    def test_record_run(self):
        auto = Automation.objects.create(name="A", crontab="0 0 * * *")
        resp = self.client.post(
            f"/api/automations/{auto.id}/run/", {"status": "failed"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        auto.refresh_from_db()
        self.assertEqual(auto.last_run_status, "failed")
