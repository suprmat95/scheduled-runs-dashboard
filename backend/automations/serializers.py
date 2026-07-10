from rest_framework import serializers

from .models import Automation, AutomationRun


class AutomationRunSerializer(serializers.ModelSerializer):
    automation_name = serializers.CharField(
        source="automation.name", read_only=True
    )

    class Meta:
        model = AutomationRun
        fields = ["id", "automation", "automation_name", "ran_at", "status"]


class AutomationSerializer(serializers.ModelSerializer):
    """Read/write serializer for an automation.

    `last_run_at`, `last_run_status` and `next_run_at` are denormalized columns
    (kept in sync by signals / save), so they're read straight off the row — no
    per-object query, which keeps list responses N+1-free at scale.
    """

    schedule_display = serializers.CharField(read_only=True)

    class Meta:
        model = Automation
        fields = [
            "id",
            "name",
            "crontab",
            "schedule_display",
            "active",
            "start_date",
            "next_run_at",
            "last_run_at",
            "last_run_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "next_run_at",
            "last_run_at",
            "last_run_status",
            "created_at",
            "updated_at",
        ]

    def validate_crontab(self, value):
        from django.core.exceptions import ValidationError as DjangoValidationError

        from .models import validate_crontab

        try:
            validate_crontab(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value
