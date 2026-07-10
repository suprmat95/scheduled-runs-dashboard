"""Keep the denormalized last-run columns in sync and invalidate read caches.

Two concerns, both centralized here so every write path (API, admin, seed,
shell) stays consistent without callers remembering to:

  1. When an AutomationRun changes, refresh the parent automation's
     `last_run_at` / `last_run_status`.
  2. On any write to Automation or AutomationRun, drop the cached read endpoints
     (matching, kpis) so they don't serve stale data.

Why `cache.clear()` (wipe everything) instead of deleting specific keys:
  - The `matching` endpoint has one cache entry *per date*, so surgical
    `cache.delete()` would mean enumerating every date key we might have written
    — which the cache backend can't do cheaply. Clearing sidesteps that.
  - This cache is used *only* by these read endpoints, so "clear everything" is
    effectively "clear our stuff": there's nothing else to collateral-damage.
  - If this cache were ever shared with other features, we'd switch to a scoped
    scheme (per-endpoint key prefixes, or a version-key namespace) so a write
    here wouldn't evict unrelated entries.
"""
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Automation, AutomationRun


@receiver(post_save, sender=AutomationRun)
@receiver(post_delete, sender=AutomationRun)
def sync_automation_last_run(sender, instance, **kwargs):
    # Guard against the cascade case: if the parent automation is already gone
    # (deleting an automation cascades to its runs), there's nothing to update.
    automation = Automation.objects.filter(pk=instance.automation_id).first()
    if automation is not None:
        automation.sync_last_run()
    # A run changed the last-run fields the cached payloads embed.
    cache.clear()


@receiver(post_save, sender=Automation)
@receiver(post_delete, sender=Automation)
def invalidate_on_automation_change(sender, **kwargs):
    # crontab / active / last-run fields all feed the cached read endpoints.
    cache.clear()
