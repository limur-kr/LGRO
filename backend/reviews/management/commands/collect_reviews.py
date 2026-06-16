import html
import json
import os
import re
from datetime import datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from restaurants.models import JjambbongRestaurant
from reviews.models import ReviewSource


NAVER_BLOG_SEARCH_URL = "https://openapi.naver.com/v1/search/blog.json"
AD_KEYWORDS = ("광고", "협찬", "제공받", "체험단", "원고료", "소정의", "업체로부터")
TASTE_KEYWORDS = ("짬뽕", "국물", "불맛", "불향", "해물", "면", "매운", "맵", "육수", "재방문")


class Command(BaseCommand):
    help = "Collect Naver Blog search snippets for restaurants into ReviewSource."

    def add_arguments(self, parser):
        scope = parser.add_mutually_exclusive_group(required=True)
        scope.add_argument("--restaurant-id", help="Collect reviews for a single restaurant UUID.")
        scope.add_argument("--all", action="store_true", help="Collect reviews for all visible restaurants.")
        parser.add_argument("--display", type=int, default=20, help="Naver result count per restaurant. 1-100.")
        parser.add_argument("--sort", choices=("sim", "date"), default="sim", help="Naver search sort.")
        parser.add_argument(
            "--query-template",
            default="{name} 짬뽕 리뷰",
            help="Search query template. Available placeholders: {name}, {address}, {region}.",
        )
        parser.add_argument("--timeout", type=int, default=10, help="HTTP timeout seconds.")

    def handle(self, *args, **options):
        client_id = os.getenv("NAVER_CLIENT_ID")
        client_secret = os.getenv("NAVER_CLIENT_SECRET")
        if not client_id or not client_secret:
            raise CommandError("NAVER_CLIENT_ID and NAVER_CLIENT_SECRET must be set in .env.")

        display = options["display"]
        if display < 1 or display > 100:
            raise CommandError("--display must be between 1 and 100.")

        restaurants = self.get_restaurants(options)
        total_created = 0
        total_updated = 0

        for restaurant in restaurants:
            query = self.build_query(restaurant, options["query_template"])
            payload = self.fetch_naver_blog_results(
                query=query,
                display=display,
                sort=options["sort"],
                client_id=client_id,
                client_secret=client_secret,
                timeout=options["timeout"],
            )
            created, updated = self.save_results(restaurant, payload.get("items", []))
            total_created += created
            total_updated += updated
            self.stdout.write(
                f"{restaurant.name}: collected {created + updated} review source(s) "
                f"({created} created, {updated} updated)"
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Review collection finished. created={total_created}, updated={total_updated}"
            )
        )

    def get_restaurants(self, options):
        queryset = JjambbongRestaurant.objects.filter(is_visible=True).select_related("region")
        if options["restaurant_id"]:
            try:
                return [queryset.get(id=options["restaurant_id"])]
            except JjambbongRestaurant.DoesNotExist as exc:
                raise CommandError("Restaurant not found or not visible.") from exc
        return list(queryset.order_by("name"))

    def build_query(self, restaurant, template):
        return template.format(
            name=restaurant.name,
            address=restaurant.address,
            region=restaurant.region.name if restaurant.region_id else "",
        )

    def fetch_naver_blog_results(self, query, display, sort, client_id, client_secret, timeout):
        params = urlencode(
            {
                "query": query,
                "display": display,
                "start": 1,
                "sort": sort,
            }
        )
        request = Request(
            f"{NAVER_BLOG_SEARCH_URL}?{params}",
            headers={
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret,
            },
            method="GET",
        )
        try:
            with urlopen(request, timeout=timeout) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise CommandError(f"Naver API returned HTTP {exc.code}: {body[:300]}") from exc
        except URLError as exc:
            raise CommandError(f"Failed to call Naver API: {exc.reason}") from exc

    def save_results(self, restaurant, items):
        created = 0
        updated = 0

        for item in items:
            title = clean_html(item.get("title", ""))[:255]
            content = clean_html(item.get("description", ""))
            url = item.get("link", "")
            if not url:
                continue

            defaults = {
                "title": title,
                "author": clean_html(item.get("bloggername", ""))[:120],
                "content": content,
                "published_at": parse_postdate(item.get("postdate")),
                "is_advertorial": is_advertorial(f"{title}\n{content}"),
                "quality_score": estimate_quality_score(f"{title}\n{content}"),
            }

            source = ReviewSource.objects.filter(
                restaurant=restaurant,
                source_type=ReviewSource.SOURCE_NAVER_BLOG,
                url=url,
            ).first()
            if source is None:
                ReviewSource.objects.create(
                    restaurant=restaurant,
                    source_type=ReviewSource.SOURCE_NAVER_BLOG,
                    url=url,
                    **defaults,
                )
                created += 1
            else:
                for key, value in defaults.items():
                    setattr(source, key, value)
                source.save(update_fields=[*defaults.keys()])
                updated += 1

        return created, updated


def clean_html(value):
    text = html.unescape(value or "")
    return re.sub(r"<[^>]+>", "", text).strip()


def parse_postdate(value):
    if not value:
        return None
    try:
        parsed = datetime.strptime(value, "%Y%m%d")
    except ValueError:
        return None
    return timezone.make_aware(parsed, timezone.get_current_timezone())


def is_advertorial(text):
    normalized = text.lower()
    return any(keyword in normalized for keyword in AD_KEYWORDS)


def estimate_quality_score(text):
    normalized = text.lower()
    score = 20
    score += min(35, len(normalized) // 8)
    score += sum(5 for keyword in TASTE_KEYWORDS if keyword in normalized)
    if is_advertorial(normalized):
        score -= 30
    return max(0, min(100, score))
