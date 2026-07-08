from django.contrib import admin

from .models import Automation, AutomationRun


class AutomationRunInline(admin.TabularInline):
    model = AutomationRun
    extra = 0


@admin.register(Automation)
class AutomationAdmin(admin.ModelAdmin):
    list_display = ("name", "crontab", "schedule_display", "active", "next_run")
    list_filter = ("active",)
    search_fields = ("name",)
    inlines = [AutomationRunInline]


@admin.register(AutomationRun)
class AutomationRunAdmin(admin.ModelAdmin):
    list_display = ("automation", "ran_at", "status")
    list_filter = ("status",)
