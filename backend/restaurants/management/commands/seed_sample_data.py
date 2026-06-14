from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from ai_analysis.models import (
    AIAnalysisResult,
    RestaurantKeyword,
    SentimentAspectScore,
    WordCloudResult,
)
from restaurants.models import JjambbongRestaurant, Region, RestaurantMenu
from reviews.models import ReviewSource


class Command(BaseCommand):
    help = "Seed development sample data for regions, restaurants, menus, and AI analysis."

    def handle(self, *args, **options):
        regions = self.seed_regions()
        restaurants = self.seed_restaurants(regions)
        self.seed_analysis(restaurants)
        self.stdout.write(self.style.SUCCESS("Sample data seeded successfully."))

    def seed_regions(self):
        region_rows = [
            {"code": "11", "name": "서울특별시", "ordering": 1},
            {"code": "28", "name": "인천광역시", "ordering": 2},
            {"code": "41", "name": "경기도", "ordering": 3},
        ]

        regions = {}
        for row in region_rows:
            region, _ = Region.objects.update_or_create(
                code=row["code"],
                defaults={
                    "name": row["name"],
                    "ordering": row["ordering"],
                    "is_active": True,
                },
            )
            regions[row["code"]] = region
        return regions

    def seed_restaurants(self, regions):
        rows = [
            {
                "name": "망원 불향짬뽕",
                "region": regions["11"],
                "address": "서울 마포구 망원로 12",
                "latitude": Decimal("37.5562000"),
                "longitude": Decimal("126.9016000"),
                "phone": "02-0000-1101",
                "opening_hours": "11:00-20:30, 월요일 휴무",
                "description": "웍 불향과 진한 고기 육수가 강점인 동네형 짬뽕집입니다.",
                "soup_style": JjambbongRestaurant.SOUP_MEAT,
                "spice_level": 4,
                "average_price": 10000,
                "sentiment_score": Decimal("91.20"),
                "youtube_featured": True,
                "menus": [
                    ("불향짬뽕", 10000, True),
                    ("차돌짬뽕", 12000, False),
                    ("탕수육 소", 16000, False),
                ],
                "scores": {
                    "soup": 94,
                    "spiciness": 82,
                    "fire": 96,
                    "noodle": 87,
                    "topping": 84,
                    "quantity": 88,
                    "price": 80,
                    "waiting": 62,
                    "hygiene": 78,
                    "service": 83,
                    "return_intent": 93,
                },
                "summary": "강한 웍 불향과 묵직한 고기 육수가 돋보이며 재방문 의사가 높은 집입니다.",
                "keywords": ["불향", "고기육수", "차돌", "칼칼함", "재방문"],
            },
            {
                "name": "송도 해물짬뽕 연구소",
                "region": regions["28"],
                "address": "인천 연수구 컨벤시아대로 55",
                "latitude": Decimal("37.3891000"),
                "longitude": Decimal("126.6453000"),
                "phone": "032-000-2801",
                "opening_hours": "10:30-21:00",
                "description": "해산물 고명과 시원한 국물 평가가 좋은 송도권 짬뽕 맛집입니다.",
                "soup_style": JjambbongRestaurant.SOUP_SEAFOOD,
                "spice_level": 3,
                "average_price": 11000,
                "sentiment_score": Decimal("88.40"),
                "youtube_featured": False,
                "menus": [
                    ("해물짬뽕", 11000, True),
                    ("백짬뽕", 10500, False),
                    ("군만두", 7000, False),
                ],
                "scores": {
                    "soup": 90,
                    "spiciness": 70,
                    "fire": 72,
                    "noodle": 84,
                    "topping": 95,
                    "quantity": 86,
                    "price": 78,
                    "waiting": 75,
                    "hygiene": 88,
                    "service": 84,
                    "return_intent": 86,
                },
                "summary": "해산물 신선도와 깔끔한 국물이 강점이고 가족 단위 방문에도 무난합니다.",
                "keywords": ["해물", "시원함", "깔끔함", "송도", "푸짐함"],
            },
            {
                "name": "수원 고기국물 짬뽕",
                "region": regions["41"],
                "address": "경기 수원시 팔달구 정조로 801",
                "latitude": Decimal("37.2807000"),
                "longitude": Decimal("127.0150000"),
                "phone": "031-000-4101",
                "opening_hours": "11:00-20:00, 브레이크 15:00-17:00",
                "description": "진한 고기 육수와 넉넉한 양으로 점심 수요가 많은 매장입니다.",
                "soup_style": JjambbongRestaurant.SOUP_MEAT,
                "spice_level": 4,
                "average_price": 9500,
                "sentiment_score": Decimal("89.70"),
                "youtube_featured": True,
                "menus": [
                    ("고기짬뽕", 9500, True),
                    ("매운짬뽕", 10500, False),
                    ("짜장면", 7000, False),
                ],
                "scores": {
                    "soup": 92,
                    "spiciness": 86,
                    "fire": 88,
                    "noodle": 82,
                    "topping": 80,
                    "quantity": 93,
                    "price": 89,
                    "waiting": 58,
                    "hygiene": 76,
                    "service": 80,
                    "return_intent": 90,
                },
                "summary": "가격 대비 양과 진한 국물 만족도가 높지만 점심 피크 대기는 감안해야 합니다.",
                "keywords": ["고기국물", "가성비", "양많음", "매콤함", "점심대기"],
            },
            {
                "name": "성수 매운짬뽕 공방",
                "region": regions["11"],
                "address": "서울 성동구 성수이로 88",
                "latitude": Decimal("37.5446000"),
                "longitude": Decimal("127.0557000"),
                "phone": "02-0000-1102",
                "opening_hours": "11:30-21:00",
                "description": "매운맛 단계 선택과 탱탱한 면 식감이 장점인 성수권 매장입니다.",
                "soup_style": JjambbongRestaurant.SOUP_MIXED,
                "spice_level": 5,
                "average_price": 11500,
                "sentiment_score": Decimal("86.10"),
                "youtube_featured": False,
                "menus": [
                    ("매운짬뽕", 11500, True),
                    ("크림짬뽕", 12500, False),
                    ("미니탕수육", 9000, False),
                ],
                "scores": {
                    "soup": 84,
                    "spiciness": 96,
                    "fire": 83,
                    "noodle": 90,
                    "topping": 78,
                    "quantity": 82,
                    "price": 72,
                    "waiting": 66,
                    "hygiene": 86,
                    "service": 79,
                    "return_intent": 85,
                },
                "summary": "강한 매운맛과 면 식감이 선명해 매운 짬뽕 취향이라면 만족도가 높습니다.",
                "keywords": ["매운맛", "탱탱한면", "성수", "단계선택", "칼칼함"],
            },
            {
                "name": "부천 노포 해장짬뽕",
                "region": regions["41"],
                "address": "경기 부천시 부일로 501",
                "latitude": Decimal("37.4844000"),
                "longitude": Decimal("126.7827000"),
                "phone": "032-000-4102",
                "opening_hours": "09:30-19:30, 일요일 휴무",
                "description": "아침 해장 수요가 있는 노포 스타일의 얼큰한 짬뽕집입니다.",
                "soup_style": JjambbongRestaurant.SOUP_SEAFOOD,
                "spice_level": 4,
                "average_price": 9000,
                "sentiment_score": Decimal("84.80"),
                "youtube_featured": False,
                "menus": [
                    ("해장짬뽕", 9000, True),
                    ("굴짬뽕", 11000, False),
                    ("볶음밥", 8500, False),
                ],
                "scores": {
                    "soup": 88,
                    "spiciness": 84,
                    "fire": 70,
                    "noodle": 78,
                    "topping": 82,
                    "quantity": 85,
                    "price": 88,
                    "waiting": 80,
                    "hygiene": 67,
                    "service": 76,
                    "return_intent": 82,
                },
                "summary": "노포 분위기와 얼큰한 해장 국물이 매력이고 대기는 비교적 적은 편입니다.",
                "keywords": ["해장", "노포", "얼큰함", "가성비", "아침영업"],
            },
        ]

        restaurants = []
        for row in rows:
            menus = row.pop("menus")
            scores = row.pop("scores")
            summary = row.pop("summary")
            keywords = row.pop("keywords")
            restaurant, _ = JjambbongRestaurant.objects.update_or_create(
                name=row["name"],
                defaults={**row, "is_visible": True},
            )
            restaurant.sample_scores = scores
            restaurant.sample_summary = summary
            restaurant.sample_keywords = keywords
            restaurants.append(restaurant)

            for index, (menu_name, price, is_signature) in enumerate(menus, start=1):
                RestaurantMenu.objects.update_or_create(
                    restaurant=restaurant,
                    name=menu_name,
                    defaults={
                        "price": price,
                        "is_signature": is_signature,
                        "ordering": index,
                    },
                )

            ReviewSource.objects.update_or_create(
                restaurant=restaurant,
                source_type=ReviewSource.SOURCE_NAVER_BLOG,
                url=f"https://example.com/reviews/{restaurant.id}",
                defaults={
                    "title": f"{restaurant.name} 블로그 리뷰 샘플",
                    "author": "sample-reviewer",
                    "content": restaurant.sample_summary,
                    "quality_score": 82,
                    "is_advertorial": False,
                },
            )

        return restaurants

    def seed_analysis(self, restaurants):
        now = timezone.now()
        aspect_labels = dict(SentimentAspectScore.ASPECT_CHOICES)

        for restaurant in restaurants:
            analysis = (
                AIAnalysisResult.objects.filter(restaurant=restaurant, is_latest=True)
                .order_by("-created_at")
                .first()
            )
            if analysis is None:
                analysis = AIAnalysisResult(restaurant=restaurant, is_latest=True)

            analysis.status = AIAnalysisResult.STATUS_COMPLETED
            analysis.blog_score = restaurant.sentiment_score
            analysis.youtube_score = Decimal("87.00") if restaurant.youtube_featured else None
            analysis.total_score = restaurant.sentiment_score
            analysis.review_count = 24
            analysis.ai_summary = restaurant.sample_summary
            analysis.error_message = ""
            analysis.analyzed_at = now
            analysis.save()

            for aspect, score in restaurant.sample_scores.items():
                SentimentAspectScore.objects.update_or_create(
                    analysis=analysis,
                    aspect=aspect,
                    defaults={
                        "score": score,
                        "summary": f"{aspect_labels.get(aspect, aspect)} 점수 {score}점",
                    },
                )

            RestaurantKeyword.objects.filter(analysis=analysis).delete()
            for index, keyword in enumerate(restaurant.sample_keywords, start=1):
                RestaurantKeyword.objects.create(
                    restaurant=restaurant,
                    analysis=analysis,
                    keyword=keyword,
                    weight=Decimal("1.000") + Decimal("0.150") * (len(restaurant.sample_keywords) - index),
                    frequency=max(1, 8 - index),
                    sentiment="positive",
                )

            WordCloudResult.objects.update_or_create(
                restaurant=restaurant,
                analysis=analysis,
                defaults={
                    "image_url": f"https://example.com/wordclouds/{restaurant.id}.png",
                    "keywords": restaurant.sample_keywords,
                },
            )
