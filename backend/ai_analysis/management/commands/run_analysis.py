import os

from django.core.management.base import BaseCommand, CommandError

from ai_analysis.models import AIAnalysisResult
from ai_analysis.pipeline import JjambbongAnalysisPipeline, save_failed_analysis
from restaurants.models import JjambbongRestaurant


class Command(BaseCommand):
    help = "Run LangGraph AI sentiment analysis for one restaurant or all visible restaurants."

    def add_arguments(self, parser):
        scope = parser.add_mutually_exclusive_group(required=True)
        scope.add_argument("--restaurant-id", help="Restaurant UUID to analyze.")
        scope.add_argument("--all", action="store_true", help="Analyze all visible restaurants sequentially.")
        parser.add_argument(
            "--model", default=None,
            help="Gemini model name. Defaults to GEMINI_MODEL env var or gemini-3.1-flash-lite.",
        )
        parser.add_argument("--fail-fast", action="store_true", help="Stop on the first failed restaurant.")

    def handle(self, *args, **options):
        if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
            raise CommandError("GOOGLE_API_KEY must be set in .env before running analysis.")

        restaurants = self.get_restaurants(options)
        pipeline = JjambbongAnalysisPipeline(model_name=options["model"])
        success_count = 0
        failure_count = 0

        for restaurant in restaurants:
            self.stdout.write(f"Analyzing {restaurant.name} ({restaurant.id})...")
            try:
                state = pipeline.run(str(restaurant.id))
                analysis_id = state["analysis_id"]
                if state.get("analysis_status") == AIAnalysisResult.STATUS_FAILED:
                    failure_count += 1
                    self.stdout.write(self.style.ERROR(f"  saved failed analysis {analysis_id}"))
                    if options["fail_fast"]:
                        raise CommandError(f"Analysis flagged for review: {restaurant.id}")
                    continue

                success_count += 1
                self.stdout.write(self.style.SUCCESS(f"  saved analysis {analysis_id}"))
            except CommandError:
                raise
            except Exception as exc:
                failure_count += 1
                save_failed_analysis(restaurant, str(exc))
                self.stdout.write(self.style.ERROR(f"  failed: {exc}"))
                if options["fail_fast"]:
                    raise CommandError(f"Analysis failed for {restaurant.id}: {exc}") from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Analysis finished. success={success_count}, failed={failure_count}"
            )
        )

    def get_restaurants(self, options):
        queryset = JjambbongRestaurant.objects.filter(is_visible=True).order_by("name")
        if options["restaurant_id"]:
            try:
                return [queryset.get(id=options["restaurant_id"])]
            except JjambbongRestaurant.DoesNotExist as exc:
                raise CommandError("Restaurant not found or not visible.") from exc
        return list(queryset)
