from django.contrib import admin

from .models import (
    JjambbongRestaurant,
    Region,
    RestaurantImage,
    RestaurantMenu,
    UserFavorite,
)


class RestaurantMenuInline(admin.TabularInline):
    model = RestaurantMenu
    extra = 1


class RestaurantImageInline(admin.TabularInline):
    model = RestaurantImage
    extra = 1


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "parent", "ordering", "is_active")
    list_filter = ("is_active",)
    search_fields = ("code", "name")


@admin.register(JjambbongRestaurant)
class JjambbongRestaurantAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "region",
        "soup_style",
        "spice_level",
        "sentiment_score",
        "youtube_featured",
        "is_visible",
    )
    list_filter = ("region", "soup_style", "spice_level", "youtube_featured", "is_visible")
    search_fields = ("name", "address", "description")
    inlines = (RestaurantMenuInline, RestaurantImageInline)


@admin.register(RestaurantMenu)
class RestaurantMenuAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "name", "price", "is_signature", "ordering")
    list_filter = ("is_signature",)
    search_fields = ("restaurant__name", "name")


@admin.register(RestaurantImage)
class RestaurantImageAdmin(admin.ModelAdmin):
    list_display = ("restaurant", "caption", "is_primary", "ordering", "created_at")
    list_filter = ("is_primary",)
    search_fields = ("restaurant__name", "caption")


@admin.register(UserFavorite)
class UserFavoriteAdmin(admin.ModelAdmin):
    list_display = ("user", "restaurant", "created_at")
    search_fields = ("user__username", "user__email", "restaurant__name")

# Register your models here.
