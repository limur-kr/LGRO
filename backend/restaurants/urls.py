from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RegionViewSet, RestaurantViewSet

router = DefaultRouter()
router.register("regions", RegionViewSet, basename="region")
router.register("restaurants", RestaurantViewSet, basename="restaurant")

urlpatterns = [
    path("", include(router.urls)),
]
