import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django

django.setup()

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("lgro")


@mcp.tool()
def add(a: int, b: int) -> int:
    """두 숫자를 더합니다."""
    return a + b


@mcp.tool()
def restaurant_count() -> int:
    """등록된 짬뽕 맛집 개수를 반환합니다 (DB 연결 확인용)."""
    from restaurants.models import JjambbongRestaurant

    return JjambbongRestaurant.objects.count()


if __name__ == "__main__":
    mcp.run()