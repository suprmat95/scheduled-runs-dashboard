from django.apps import AppConfig


class AutomationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "automations"

    def ready(self):
        # Register signal handlers that keep denormalized fields in sync.
        from . import signals  # noqa: F401
