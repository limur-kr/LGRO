from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import RegionViewSet, RestaurantImageViewSet, RestaurantViewSet

router = DefaultRouter()
router.register("regions", RegionViewSet, basename="region")
router.register("restaurants", RestaurantViewSet, basename="restaurant")
router.register("restaurant-images", RestaurantImageViewSet, basename="restaurant-image")

urlpatterns = [
    path("", include(router.urls)),
]
