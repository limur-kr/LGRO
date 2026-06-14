from django.contrib import admin

from .models import Answer, Question


class AnswerInline(admin.TabularInline):
    model = Answer
    extra = 0


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "status", "is_public", "created_at", "updated_at")
    list_filter = ("status", "is_public")
    search_fields = ("title", "content", "user__username", "user__email")
    inlines = (AnswerInline,)


@admin.register(Answer)
class AnswerAdmin(admin.ModelAdmin):
    list_display = ("question", "author", "created_at", "updated_at")
    search_fields = ("question__title", "content", "author__username", "author__email")

# Register your models here.
