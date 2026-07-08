"""Keep the denormalized last-run columns on Automation in sync.

Whenever an AutomationRun is created, changed or deleted — via the API's run
endpoint, the admin, the seed command or a shell — we refresh the parent
automation's `last_run_at` / `last_run_status`. Centralizing it here means every
write path stays consistent without callers remembering to.
"""
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
