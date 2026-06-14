from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIClient

from restaurants.models import JjambbongRestaurant


class Command(BaseCommand):
    help = "Verify core API responses using DRF APIClient."

    def add_arguments(self, parser):
        parser.add_argument("--username", default="admin")
        parser.add_argument("--password", default="Admin1234!")

    def handle(self, *args, **options):
        restaurant = JjambbongRestaurant.objects.filter(is_visible=True).order_by("name").first()
        if restaurant is None:
            raise CommandError("No visible restaurants found. Run seed_sample_data first.")

        client = APIClient(HTTP_HOST="localhost")
        checks = []

        self.check_get(client, "/api/regions/", checks, "regions")
        self.check_get(client, "/api/restaurants/", checks, "restaurants")
        self.check_get(client, f"/api/restaurants/{restaurant.id}/", checks, "restaurant_detail")
        self.check_get(client, f"/api/restaurants/{restaurant.id}/menus/", checks, "restaurant_menus")
        self.check_get(client, f"/api/restaurants/{restaurant.id}/sentiment/", checks, "sentiment")
        self.check_get(client, f"/api/restaurants/{restaurant.id}/wordcloud/", checks, "wordcloud")
        self.check_get(client, "/api/questions/", checks, "questions")

        login_response = client.post(
            "/api/auth/login/",
            {"username": options["username"], "password": options["password"]},
            format="json",
        )
        self.record(checks, "auth_login", login_response)
        if login_response.status_code != 200:
            self.print_checks(checks)
            raise CommandError("Auth login failed.")

        access_token = login_response.json()["access"]
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        self.check_get(client, "/api/auth/me/", checks, "auth_me")

        favorite_response = client.post(f"/api/restaurants/{restaurant.id}/favorite/")
        self.record(checks, "favorite_create", favorite_response)

        self.print_checks(checks)
        failed = [item for item in checks if item["status"] >= 400]
        if failed:
            raise CommandError(f"{len(failed)} API check(s) failed.")

    def check_get(self, client, path, checks, label):
        response = client.get(path)
        self.record(checks, label, response)

    def record(self, checks, label, response):
        payload = self.safe_json(response)
        checks.append(
            {
                "label": label,
                "status": response.status_code,
                "summary": self.summarize(payload),
            }
        )

    def safe_json(self, response):
        try:
            return response.json()
        except ValueError:
            return response.content.decode("utf-8", errors="replace")[:200]

    def summarize(self, payload):
        if isinstance(payload, list):
            return f"list[{len(payload)}]"
        if isinstance(payload, dict):
            if "results" in payload and isinstance(payload["results"], list):
                return f"paginated results[{len(payload['results'])}], count={payload.get('count')}"
            keys = ", ".join(list(payload.keys())[:8])
            return f"object keys: {keys}"
        return str(payload)[:120]

    def print_checks(self, checks):
        for item in checks:
            status = item["status"]
            style = self.style.SUCCESS if status < 400 else self.style.ERROR
            self.stdout.write(style(f"{item['label']}: {status} - {item['summary']}"))
