from django.core.cache import cache
from rest_framework.test import APITestCase

from automations.models import Automation, AutomationRun


class CacheInvalidationTests(APITestCase):
    """The read endpoints cache; any Automation/AutomationRun write clears it."""

    def setUp(self):
        cache.clear()

    def test_kpis_response_is_cached(self):
        self.client.get("/api/automations/kpis/")
        self.assertIsNotNone(cache.get("automations:kpis"))

    def test_write_clears_kpis_cache(self):
        self.client.get("/api/automations/kpis/")
        self.assertIsNotNone(cache.get("automations:kpis"))
        # A model write fires the signal that clears the cache.
        Automation.objects.create(name="New", crontab="0 0 * * *")
        self.assertIsNone(cache.get("automations:kpis"))

    def test_run_write_clears_cache(self):
        auto = Automation.objects.create(name="A", crontab="0 0 * * *")
        self.client.get("/api/automations/kpis/")
        self.assertIsNotNone(cache.get("automations:kpis"))
        AutomationRun.objects.create(automation=auto, status="success")
        self.assertIsNone(cache.get("automations:kpis"))

    def test_kpis_reflects_data_after_invalidation(self):
        self.assertEqual(
            self.client.get("/api/automations/kpis/").data["total_automations"], 0
        )
        Automation.objects.create(name="A", crontab="0 0 * * *")
        # Cache was cleared by the create, so the next read recomputes.
        self.assertEqual(
            self.client.get("/api/automations/kpis/").data["total_automations"], 1
        )

    def test_matching_cached_per_date(self):
        self.client.get("/api/automations/matching/?date=2026-07-09")
        self.assertIsNotNone(cache.get("automations:matching:2026-07-09"))
