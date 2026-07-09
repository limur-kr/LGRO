import os
from decimal import Decimal
from typing import Any, TypedDict

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from ai_analysis.models import AIAnalysisResult, RestaurantKeyword, SentimentAspectScore, WordCloudResult
from restaurants.models import JjambbongRestaurant
from reviews.models import ReviewSource


ASPECTS = (
    SentimentAspectScore.ASPECT_SOUP,
    SentimentAspectScore.ASPECT_SPICINESS,
    SentimentAspectScore.ASPECT_FIRE,
    SentimentAspectScore.ASPECT_NOODLE,
    SentimentAspectScore.ASPECT_TOPPING,
    SentimentAspectScore.ASPECT_QUANTITY,
    SentimentAspectScore.ASPECT_PRICE,
    SentimentAspectScore.ASPECT_WAITING,
    SentimentAspectScore.ASPECT_HYGIENE,
    SentimentAspectScore.ASPECT_SERVICE,
    SentimentAspectScore.ASPECT_RETURN_INTENT,
)

ASPECT_LABELS = {
    SentimentAspectScore.ASPECT_SOUP: "국물",
    SentimentAspectScore.ASPECT_SPICINESS: "매운맛",
    SentimentAspectScore.ASPECT_FIRE: "불향",
    SentimentAspectScore.ASPECT_NOODLE: "면 식감",
    SentimentAspectScore.ASPECT_TOPPING: "해물/고명",
    SentimentAspectScore.ASPECT_QUANTITY: "양",
    SentimentAspectScore.ASPECT_PRICE: "가격",
    SentimentAspectScore.ASPECT_WAITING: "대기",
    SentimentAspectScore.ASPECT_HYGIENE: "위생",
    SentimentAspectScore.ASPECT_SERVICE: "서비스",
    SentimentAspectScore.ASPECT_RETURN_INTENT: "재방문 의사",
}

AD_KEYWORDS = ("광고", "협찬", "제공받은", "체험단", "원고료", "소정의", "업체로부터")
REVIEW_DETAIL_KEYWORDS = ("국물", "불맛", "불향", "면", "해물", "고기", "매운", "맵", "가격", "대기", "서비스")
ISSUE_KEYWORDS = ("식중독", "고발", "위생불량", "위생 문제", "바퀴벌레", "이물질", "폐업", "영업중단", "환불 거부", "신고")

ROUTE_STANDARD = "standard"
ROUTE_CREATIVE_FALLBACK = "creative_fallback"
ROUTE_ISSUE_FLAGGED = "issue_flagged"
QUALITY_RETRY = "retry"
QUALITY_APPROVE = "approve"
MIN_STANDARD_REVIEW_COUNT = 5
MAX_REVISION_COUNT = 2
MAX_REVIEWS_PER_ANALYSIS = 30  # LLM 프롬프트에 포함할 리뷰 상한
SOURCE_FETCH_LIMIT = 200       # DB에서 한 번에 가져올 ReviewSource 상한


class AnalysisState(TypedDict, total=False):
    restaurant_id: str
    restaurant: dict[str, Any]
    reviews: list[dict[str, Any]]
    aspect_scores: dict[str, int]
    aspect_summaries: dict[str, str]
    keywords: list[dict[str, Any]]
    summary: str
    review_count: int
    blog_score: int
    analysis_id: str
    analysis_status: str
    route: str
    revision_count: int
    is_valid_format: bool
    feedback_notes: str
    issue_reason: str


def run_analysis_for_restaurant(restaurant_id: str, model_name: str | None = None) -> AIAnalysisResult:
    pipeline = JjambbongAnalysisPipeline(model_name=model_name)
    state = pipeline.run(restaurant_id)
    return AIAnalysisResult.objects.get(id=state["analysis_id"])


def save_failed_analysis(restaurant: JjambbongRestaurant, message: str) -> AIAnalysisResult:
    with transaction.atomic():
        AIAnalysisResult.objects.filter(restaurant=restaurant, is_latest=True).update(is_latest=False)
        return AIAnalysisResult.objects.create(
            restaurant=restaurant,
            status=AIAnalysisResult.STATUS_FAILED,
            total_score=Decimal("0"),
            review_count=0,
            ai_summary="",
            error_message=message[:2000],
            is_latest=True,
            analyzed_at=timezone.now(),
        )


class JjambbongAnalysisPipeline:
    def __init__(self, model_name: str | None = None):
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        self._restaurant_cache: dict[str, JjambbongRestaurant] = {}
        self._model = create_structured_gemini_model(self.model_name)
        self.graph = self.build_graph()

    def build_graph(self):
        try:
            from langgraph.graph import END, START, StateGraph
        except ImportError as exc:
            raise RuntimeError(
                "LangGraph is not installed. Install backend dependencies with uv sync or pip install."
            ) from exc

        workflow = StateGraph(AnalysisState)
        workflow.add_node("content_validator", self.content_validator)
        workflow.add_node("standard_analyzer", self.standard_analyzer)
        workflow.add_node("creative_analyzer", self.creative_analyzer)
        workflow.add_node("issue_handler", self.issue_handler)
        workflow.add_node("check_quality", self.check_output_quality_node)
        workflow.add_node("retry_analyzer", self.retry_analyzer)
        workflow.add_node("keyword_extractor", self.keyword_extractor)
        workflow.add_node("result_saver", self.result_saver)

        workflow.add_edge(START, "content_validator")
        workflow.add_conditional_edges(
            "content_validator",
            self.route_by_volume,
            {
                ROUTE_STANDARD: "standard_analyzer",
                ROUTE_CREATIVE_FALLBACK: "creative_analyzer",
                ROUTE_ISSUE_FLAGGED: "issue_handler",
            },
        )
        workflow.add_edge("standard_analyzer", "check_quality")
        workflow.add_edge("creative_analyzer", "check_quality")
        workflow.add_edge("issue_handler", "result_saver")
        workflow.add_conditional_edges(
            "check_quality",
            self.route_quality_check,
            {
                QUALITY_RETRY: "retry_analyzer",
                QUALITY_APPROVE: "keyword_extractor",
            },
        )
        workflow.add_edge("retry_analyzer", "check_quality")
        workflow.add_edge("keyword_extractor", "result_saver")
        workflow.add_edge("result_saver", END)

        agent_graph = workflow.compile()
        self._write_debug_graph_png(agent_graph)
        return agent_graph

    def _write_debug_graph_png(self, agent_graph) -> None:
        should_write = os.getenv("WRITE_LANGGRAPH_PNG", "").lower() in {"1", "true", "yes", "on"}
        try:
            should_write = should_write and settings.DEBUG
        except Exception:
            should_write = False

        if not should_write:
            return

        path = os.getenv("LANGGRAPH_PNG_PATH", "agent_graph.png")
        try:
            with open(path, "wb") as f:
                f.write(agent_graph.get_graph().draw_mermaid_png())
        except Exception:
            pass

    def run(self, restaurant_id: str) -> AnalysisState:
        return self.graph.invoke(
            {
                "restaurant_id": str(restaurant_id),
                "revision_count": 0,
                "route": ROUTE_STANDARD,
                "is_valid_format": False,
                "feedback_notes": "",
            }
        )

    def get_restaurant(self, restaurant_id: str) -> JjambbongRestaurant:
        key = str(restaurant_id)
        if key not in self._restaurant_cache:
            self._restaurant_cache[key] = get_restaurant(key)
        return self._restaurant_cache[key]

    def content_validator(self, state: AnalysisState) -> AnalysisState:
        restaurant = self.get_restaurant(state["restaurant_id"])
        sources = list(
            ReviewSource.objects.filter(restaurant=restaurant)
            .order_by("-published_at", "-collected_at")
            [:SOURCE_FETCH_LIMIT]
        )
        reviews = []
        raw_texts = []
        bulk_update_sources = []

        for source in sources:
            text = normalize_review_text(source)
            raw_texts.append(text)
            is_ad = is_advertorial(text)
            quality_score = estimate_quality_score(text)
            if source.is_advertorial != is_ad or source.quality_score != quality_score:
                source.is_advertorial = is_ad
                source.quality_score = quality_score
                bulk_update_sources.append(source)

            if is_ad or quality_score < 30 or len(text) < 20:
                continue

            reviews.append(
                {
                    "source_id": str(source.id),
                    "source_type": source.source_type,
                    "title": source.title,
                    "url": source.url,
                    "author": source.author,
                    "content": text,
                    "quality_score": quality_score,
                    "published_at": source.published_at.isoformat() if source.published_at else None,
                }
            )

        if bulk_update_sources:
            ReviewSource.objects.bulk_update(bulk_update_sources, ["is_advertorial", "quality_score"])

        reviews = sorted(reviews, key=lambda r: r["quality_score"], reverse=True)[:MAX_REVIEWS_PER_ANALYSIS]

        route, issue_reason = determine_route(reviews, raw_texts)
        return {
            "restaurant": serialize_restaurant(restaurant),
            "reviews": reviews,
            "review_count": len(reviews),
            "route": route,
            "issue_reason": issue_reason,
            "revision_count": state.get("revision_count", 0),
        }

    def route_by_volume(self, state: AnalysisState) -> str:
        route = state.get("route", ROUTE_STANDARD)
        if route in {ROUTE_STANDARD, ROUTE_CREATIVE_FALLBACK, ROUTE_ISSUE_FLAGGED}:
            return route
        return ROUTE_STANDARD

    def standard_analyzer(self, state: AnalysisState) -> AnalysisState:
        return self.run_llm_analysis(state, mode=ROUTE_STANDARD)

    def creative_analyzer(self, state: AnalysisState) -> AnalysisState:
        return self.run_llm_analysis(state, mode=ROUTE_CREATIVE_FALLBACK)

    def retry_analyzer(self, state: AnalysisState) -> AnalysisState:
        revision_count = state.get("revision_count", 0) + 1
        result = self.run_llm_analysis(
            {**state, "revision_count": revision_count},
            mode=state.get("route", ROUTE_STANDARD),
        )
        result["revision_count"] = revision_count
        return result

    def run_llm_analysis(self, state: AnalysisState, mode: str) -> AnalysisState:
        restaurant = self.get_restaurant(state["restaurant_id"])
        prompt = build_analysis_prompt(
            restaurant=restaurant,
            reviews=state.get("reviews", []),
            mode=mode,
            feedback_notes=state.get("feedback_notes", ""),
            revision_count=state.get("revision_count", 0),
        )
        response = coerce_response_dict(self._model.invoke(prompt))

        aspect_scores = {}
        aspect_summaries = {}
        for item in response.get("aspect_scores", []):
            if not isinstance(item, dict):
                continue
            aspect = item.get("aspect")
            if aspect in ASPECTS:
                aspect_scores[aspect] = clamp_score(item.get("score", 0))
                aspect_summaries[aspect] = str(item.get("summary", ""))[:255]

        blog_score = clamp_score(response.get("blog_score", average_score(aspect_scores.values())))
        return {
            "aspect_scores": aspect_scores,
            "aspect_summaries": aspect_summaries,
            "keywords": response.get("keywords", []),
            "summary": str(response.get("summary", "")).strip()[:2000],
            "blog_score": blog_score,
            "revision_count": state.get("revision_count", 0),
        }

    def issue_handler(self, state: AnalysisState) -> AnalysisState:
        reason = state.get("issue_reason") or "관리자 확인이 필요한 리뷰 상태입니다."
        return {
            "aspect_scores": {},
            "aspect_summaries": {},
            "keywords": [],
            "summary": reason,
            "blog_score": 0,
            "is_valid_format": False,
            "feedback_notes": reason,
        }

    def check_output_quality_node(self, state: AnalysisState) -> AnalysisState:
        is_valid, feedback_notes = validate_analysis_output(state)
        return {
            "is_valid_format": is_valid,
            "feedback_notes": feedback_notes,
        }

    def route_quality_check(self, state: AnalysisState) -> str:
        if state.get("is_valid_format", False):
            return QUALITY_APPROVE
        if state.get("revision_count", 0) < MAX_REVISION_COUNT:
            return QUALITY_RETRY
        return QUALITY_APPROVE

    def keyword_extractor(self, state: AnalysisState) -> AnalysisState:
        raw_keywords = state.get("keywords", [])
        normalized = []
        seen = set()

        for item in raw_keywords:
            if not isinstance(item, dict):
                continue
            keyword = str(item.get("keyword", "")).strip()
            if not keyword or keyword in seen:
                continue
            seen.add(keyword)
            normalized.append(
                {
                    "keyword": keyword[:80],
                    "weight": normalize_weight(item.get("weight", 1)),
                    "frequency": max(1, int(item.get("frequency") or 1)),
                    "sentiment": normalize_sentiment(item.get("sentiment")),
                }
            )

        if len(normalized) < 5:
            normalized.extend(extract_fallback_keywords(state.get("reviews", []), seen))

        return {"keywords": normalized[:20]}

    def result_saver(self, state: AnalysisState) -> AnalysisState:
        restaurant = self.get_restaurant(state["restaurant_id"])
        is_issue = state.get("route") == ROUTE_ISSUE_FLAGGED
        review_count = state.get("review_count", len(state.get("reviews", [])))
        error_message = state.get("issue_reason") or ""

        if is_issue:
            status = AIAnalysisResult.STATUS_FAILED
            aspect_scores = {}
            aspect_summaries = {}
            total_score = Decimal("0")
            blog_score = None
            summary = state.get("summary") or error_message
            error_message = error_message or summary
        else:
            status = AIAnalysisResult.STATUS_COMPLETED
            aspect_scores, aspect_summaries = complete_aspect_payload(state)
            total_score = Decimal(str(round(average_score(aspect_scores.values()), 2)))
            blog_score = Decimal(str(state.get("blog_score", total_score)))
            summary = state.get("summary", "")
            if not state.get("is_valid_format", True):
                error_message = state.get("feedback_notes", "")[:2000]

        with transaction.atomic():
            AIAnalysisResult.objects.filter(restaurant=restaurant, is_latest=True).update(is_latest=False)
            analysis = AIAnalysisResult.objects.create(
                restaurant=restaurant,
                status=status,
                blog_score=blog_score,
                youtube_score=None,
                total_score=total_score,
                review_count=review_count,
                ai_summary=summary,
                error_message=error_message[:2000],
                is_latest=True,
                analyzed_at=timezone.now(),
            )

            if status == AIAnalysisResult.STATUS_COMPLETED:
                for aspect, score in aspect_scores.items():
                    SentimentAspectScore.objects.create(
                        analysis=analysis,
                        aspect=aspect,
                        score=score,
                        summary=aspect_summaries.get(aspect, "")[:255],
                    )

                for item in state.get("keywords", []):
                    RestaurantKeyword.objects.create(
                        restaurant=restaurant,
                        analysis=analysis,
                        keyword=item["keyword"],
                        weight=Decimal(str(item["weight"])),
                        frequency=item["frequency"],
                        sentiment=item["sentiment"],
                    )

                WordCloudResult.objects.update_or_create(
                    restaurant=restaurant,
                    analysis=analysis,
                    defaults={"keywords": [item["keyword"] for item in state.get("keywords", [])]},
                )

                restaurant.sentiment_score = total_score
                restaurant.save(update_fields=["sentiment_score", "updated_at"])

        return {
            "analysis_id": str(analysis.id),
            "analysis_status": analysis.status,
        }


def get_restaurant(restaurant_id: str) -> JjambbongRestaurant:
    return JjambbongRestaurant.objects.select_related("region").get(id=restaurant_id)


def serialize_restaurant(restaurant: JjambbongRestaurant) -> dict[str, Any]:
    return {
        "id": str(restaurant.id),
        "name": restaurant.name,
        "address": restaurant.address,
        "region": restaurant.region.name if restaurant.region_id else "미상",
    }


def determine_route(reviews: list[dict[str, Any]], raw_texts: list[str]) -> tuple[str, str]:
    issue_keyword = find_issue_keyword("\n".join(raw_texts))
    if issue_keyword:
        return ROUTE_ISSUE_FLAGGED, f"관리자 확인 키워드가 감지되었습니다: {issue_keyword}"

    if not reviews:
        return ROUTE_ISSUE_FLAGGED, "사용 가능한 리뷰가 없습니다. collect_reviews 실행 또는 리뷰 품질 확인이 필요합니다."

    if len(reviews) < MIN_STANDARD_REVIEW_COUNT:
        return ROUTE_CREATIVE_FALLBACK, ""

    return ROUTE_STANDARD, ""


def find_issue_keyword(text: str) -> str | None:
    normalized = text.lower()
    for keyword in ISSUE_KEYWORDS:
        if keyword.lower() in normalized:
            return keyword
    return None


def create_structured_gemini_model(model_name: str):
    if not os.getenv("GOOGLE_API_KEY") and not os.getenv("GEMINI_API_KEY"):
        raise ValueError("GOOGLE_API_KEY must be set before running AI analysis.")

    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
    except ImportError as exc:
        raise RuntimeError(
            "langchain-google-genai is not installed. Install backend dependencies with uv sync or pip install."
        ) from exc

    schema = {
        "title": "JjambbongReviewAnalysis",
        "type": "object",
        "properties": {
            "aspect_scores": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "aspect": {"type": "string", "enum": list(ASPECTS)},
                        "score": {"type": "integer", "minimum": 0, "maximum": 100},
                        "summary": {"type": "string"},
                    },
                    "required": ["aspect", "score", "summary"],
                },
            },
            "keywords": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "keyword": {"type": "string"},
                        "weight": {"type": "number", "minimum": 0, "maximum": 2},
                        "frequency": {"type": "integer", "minimum": 1},
                        "sentiment": {"type": "string", "enum": ["positive", "neutral", "negative"]},
                    },
                    "required": ["keyword", "weight", "frequency", "sentiment"],
                },
            },
            "summary": {"type": "string"},
            "blog_score": {"type": "integer", "minimum": 0, "maximum": 100},
        },
        "required": ["aspect_scores", "keywords", "summary", "blog_score"],
    }
    model = ChatGoogleGenerativeAI(model=model_name, temperature=0.2, max_retries=2)
    return model.with_structured_output(schema=schema, method="json_schema")


def build_analysis_prompt(
    restaurant: JjambbongRestaurant,
    reviews: list[dict[str, Any]],
    mode: str = ROUTE_STANDARD,
    feedback_notes: str = "",
    revision_count: int = 0,
) -> str:
    review_text = "\n\n".join(
        f"[{index}] title={review['title']}\ncontent={review['content'][:1200]}"
        for index, review in enumerate(reviews[:MAX_REVIEWS_PER_ANALYSIS], start=1)
    )
    aspect_descriptions = "\n".join(f"- {key}: {label}" for key, label in ASPECT_LABELS.items())
    mode_guidance = {
        ROUTE_STANDARD: "리뷰 근거를 우선하고, 명시된 경험을 중심으로 보수적으로 점수화하세요.",
        ROUTE_CREATIVE_FALLBACK: (
            "사용 가능한 리뷰가 5개 미만입니다. 적은 근거에서 과신하지 말고, "
            "명확하지 않은 항목은 45~60 사이 중립 점수로 처리하세요."
        ),
    }.get(mode, "")
    retry_guidance = ""
    if feedback_notes:
        retry_guidance = f"""

이전 응답 검증 피드백:
{feedback_notes}
이번 응답에서는 위 문제를 반드시 고쳐서 다시 작성하세요. 재시도 횟수: {revision_count}
""".rstrip()

    return f"""
당신은 짬뽕 리뷰 감성분석 전문가입니다.
아래 식당과 네이버 블로그 리뷰 요약을 분석해 JSON 스키마에 맞게만 응답하세요.

식당명: {restaurant.name}
주소: {restaurant.address}
지역: {restaurant.region.name if restaurant.region_id else "미상"}
분석 모드: {mode}
분석 항목:
{aspect_descriptions}

채점 규칙:
- aspect_scores에는 위 11개 aspect를 모두 한 번씩 포함해야 합니다.
- 각 항목은 0~100 정수 점수입니다.
- 실제 리뷰 근거가 강하면 높은 점수, 불만/부정 근거가 강하면 낮은 점수입니다.
- 근거가 부족하면 45~60 사이 중립 점수로 둡니다.
- summary는 화면에 바로 노출할 수 있는 한국어 한두 문장입니다.
- keywords는 핵심 맛/경험 키워드 5~15개를 뽑고 sentiment는 positive/neutral/negative 중 하나입니다.
- {mode_guidance}
{retry_guidance}

리뷰:
{review_text}
""".strip()


def coerce_response_dict(response: Any) -> dict[str, Any]:
    if isinstance(response, dict):
        return response
    if hasattr(response, "model_dump"):
        return response.model_dump()
    if hasattr(response, "dict"):
        return response.dict()
    return {}


def validate_analysis_output(state: AnalysisState) -> tuple[bool, str]:
    scores = state.get("aspect_scores", {})
    feedback = []
    missing_aspects = [aspect for aspect in ASPECTS if aspect not in scores]
    unknown_aspects = [aspect for aspect in scores if aspect not in ASPECTS]
    out_of_range = [
        aspect
        for aspect, score in scores.items()
        if not isinstance(score, int) or not 0 <= score <= 100
    ]

    if missing_aspects:
        feedback.append(f"누락된 aspect: {', '.join(missing_aspects)}")
    if unknown_aspects:
        feedback.append(f"허용되지 않은 aspect: {', '.join(unknown_aspects)}")
    if out_of_range:
        feedback.append(f"0~100 범위를 벗어난 점수: {', '.join(out_of_range)}")
    if not str(state.get("summary", "")).strip():
        feedback.append("summary가 비어 있습니다.")
    if not isinstance(state.get("keywords", []), list):
        feedback.append("keywords가 배열이 아닙니다.")

    return not feedback, " ".join(feedback)


def complete_aspect_payload(state: AnalysisState) -> tuple[dict[str, int], dict[str, str]]:
    raw_scores = state.get("aspect_scores", {})
    raw_summaries = state.get("aspect_summaries", {})
    scores = {}
    summaries = {}
    for aspect in ASPECTS:
        if aspect not in raw_scores:
            scores[aspect] = 50
            summaries[aspect] = "분석 근거가 부족해 중립 점수로 보정했습니다."
        else:
            scores[aspect] = clamp_score(raw_scores[aspect])
            summaries[aspect] = str(raw_summaries.get(aspect, ""))[:255]
    return scores, summaries


def normalize_review_text(source: ReviewSource) -> str:
    return "\n".join(part for part in (source.title, source.content) if part).strip()


def is_advertorial(text: str) -> bool:
    normalized = text.lower()
    return any(keyword in normalized for keyword in AD_KEYWORDS)


def estimate_quality_score(text: str) -> int:
    normalized = text.lower()
    score = 20
    score += min(35, len(normalized) // 8)
    score += sum(5 for keyword in REVIEW_DETAIL_KEYWORDS if keyword in normalized)
    if is_advertorial(normalized):
        score -= 30
    return max(0, min(100, score))


def clamp_score(value: Any) -> int:
    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        score = 0
    return max(0, min(100, score))


def average_score(values) -> float:
    numbers = [float(value) for value in values]
    if not numbers:
        return 0
    return sum(numbers) / len(numbers)


def normalize_weight(value: Any) -> float:
    try:
        weight = float(value)
    except (TypeError, ValueError):
        weight = 1.0
    return round(max(0.0, min(2.0, weight)), 3)


def normalize_sentiment(value: Any) -> str:
    if value in {"positive", "neutral", "negative"}:
        return value
    return "neutral"


def extract_fallback_keywords(reviews: list[dict[str, Any]], seen: set[str]) -> list[dict[str, Any]]:
    candidates = []
    text = " ".join(review.get("content", "") for review in reviews)
    for keyword in REVIEW_DETAIL_KEYWORDS:
        frequency = text.count(keyword)
        if frequency and keyword not in seen:
            candidates.append(
                {
                    "keyword": keyword,
                    "weight": round(min(2.0, 0.8 + frequency * 0.1), 3),
                    "frequency": frequency,
                    "sentiment": "neutral",
                }
            )
    return candidates
