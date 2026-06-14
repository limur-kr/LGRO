from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ("username", "email", "display_name", "role", "is_staff", "is_active")
    list_filter = ("role", "is_staff", "is_active", "oauth_provider")
    search_fields = ("username", "email", "display_name")
    fieldsets = UserAdmin.fieldsets + (
        (
            "서비스 정보",
            {
                "fields": (
                    "display_name",
                    "role",
                    "profile_image_url",
                    "oauth_provider",
                    "oauth_subject",
                )
            },
        ),
    )

# Register your models here.
