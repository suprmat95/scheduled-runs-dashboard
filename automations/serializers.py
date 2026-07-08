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
    """Read/write serializer for an automation, with derived last-run info."""

    last_run = serializers.SerializerMethodField()
    last_run_status = serializers.SerializerMethodField()
    schedule_display = serializers.CharField(read_only=True)
    next_run = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Automation
        fields = [
            "id",
            "name",
            "crontab",
            "schedule_display",
            "active",
            "start_date",
            "next_run",
            "last_run",
            "last_run_status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_crontab(self, value):
        from .models import validate_crontab
        from django.core.exceptions import ValidationError as DjangoValidationError

        try:
            validate_crontab(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)
        return value

    def get_last_run(self, obj):
        run = obj.last_run
        return run.ran_at if run else None

    def get_last_run_status(self, obj):
        run = obj.last_run
        return run.status if run else None
