import os
import time
from decimal import Decimal
from json import JSONDecodeError
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.core.management.base import BaseCommand, CommandError

from restaurants.models import JjambbongRestaurant

KAKAO_GEO_URL = "https://dapi.kakao.com/v2/local/search/address.json"


class Command(BaseCommand):
    help = "Kakao 주소 검색 API로 좌표가 없는 식당의 latitude/longitude를 채웁니다."

    def add_arguments(self, parser):
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="좌표가 이미 있는 식당도 덮어씁니다.",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.15,
            help="API 호출 사이 대기 시간(초). 기본값 0.15",
        )

    def handle(self, *args, **options):
        api_key = os.getenv("KAKAO_REST_API_KEY", "")
        if not api_key:
            raise CommandError("KAKAO_REST_API_KEY가 .env에 설정되어 있지 않습니다.")

        qs = JjambbongRestaurant.objects.filter(is_visible=True)
        if not options["overwrite"]:
            qs = qs.filter(latitude__isnull=True)

        restaurants = list(qs.order_by("name"))
        if not restaurants:
            self.stdout.write(self.style.SUCCESS("좌표가 없는 식당이 없습니다."))
            return

        self.stdout.write(f"지오코딩 대상: {len(restaurants)}개")
        success = failed = skipped = 0

        for restaurant in restaurants:
            if not restaurant.address:
                self.stdout.write(self.style.WARNING(f"  SKIP (주소 없음) {restaurant.name}"))
                skipped += 1
                continue

            coords = self._geocode(restaurant.address, api_key, options["delay"])
            if coords:
                restaurant.latitude, restaurant.longitude = coords
                restaurant.save(update_fields=["latitude", "longitude", "updated_at"])
                self.stdout.write(
                    self.style.SUCCESS(f"  OK  {restaurant.name} → {coords[0]}, {coords[1]}")
                )
                success += 1
            else:
                self.stdout.write(
                    self.style.ERROR(f"  FAIL {restaurant.name} ({restaurant.address})")
                )
                failed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n완료: 성공 {success}개 / 실패 {failed}개 / 건너뜀 {skipped}개"
            )
        )

    def _geocode(self, address: str, api_key: str, delay: float):
        url = KAKAO_GEO_URL + "?" + urlencode({"query": address})
        req = Request(url, headers={"Authorization": f"KakaoAK {api_key}"})
        try:
            with urlopen(req, timeout=10) as resp:
                data = __import__("json").loads(resp.read())
            documents = data.get("documents", [])
            if not documents:
                return None
            doc = documents[0]
            return Decimal(doc["y"]), Decimal(doc["x"])
        except HTTPError as e:
            self.stderr.write(f"    HTTPError {e.code}: {address}")
            return None
        except (URLError, JSONDecodeError, KeyError) as e:
            self.stderr.write(f"    Error: {e}: {address}")
            return None
        finally:
            time.sleep(delay)
