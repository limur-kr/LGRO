from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Create or update a local development superuser."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--email", default="admin@example.com")
        parser.add_argument("--password", default="Admin1234!")

    def handle(self, *args, **options):
        User = get_user_model()
        user, created = User.objects.update_or_create(
            username=options["username"],
            defaults={
                "email": options["email"],
                "display_name": "관리자",
                "role": getattr(User, "ROLE_ADMIN", "admin"),
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )
        user.set_password(options["password"])
        user.save(update_fields=["password", "updated_at"])

        action = "created" if created else "updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"Development superuser {action}: {options['username']} <{options['email']}>"
            )
        )
