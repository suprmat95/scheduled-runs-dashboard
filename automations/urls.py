from rest_framework.routers import DefaultRouter

from .views import AutomationRunViewSet, AutomationViewSet

router = DefaultRouter()
router.register(r"automations", AutomationViewSet, basename="automation")
router.register(r"runs", AutomationRunViewSet, basename="run")

urlpatterns = router.urls
