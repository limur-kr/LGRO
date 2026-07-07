import json
import os
from decimal import Decimal
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def geocode_address(address: str) -> tuple[Decimal, Decimal] | None:
    rest_api_key = os.getenv("KAKAO_REST_API_KEY", "")
    if not rest_api_key or not address:
        return None
    url = "https://dapi.kakao.com/v2/local/search/address.json?" + urlencode({"query": address})
    req = Request(url, headers={"Authorization": f"KakaoAK {rest_api_key}"})
    try:
        with urlopen(req, timeout=5) as response:
            data = json.loads(response.read())
        documents = data.get("documents", [])
        if not documents:
            return None
        doc = documents[0]
        return Decimal(doc["y"]), Decimal(doc["x"])
    except (URLError, KeyError, Exception):
        return None
