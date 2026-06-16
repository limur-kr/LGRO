# LGRO 프로젝트 — LangGraph 파이프라인 고도화 설계 검토서

> 작성일: 2026-06-16  
> 대상 파일: `pipeline.py` (현행), `main.py` (참조 패턴)  
> 목표: 순차형 파이프라인 → 조건부 라우팅 + 품질 검토 루프 멀티에이전트 아키텍처

---

## 1. 현행 구조 분석

### 현행 `pipeline.py` 워크플로우

```
[START] → content_validator → llm_analyzer → keyword_extractor → result_saver → [END]
```

완전한 직선형 구조로, 분기 없이 모든 매장이 동일한 경로를 통과한다.  
`main.py`는 이메일 성격(긴급도, 카테고리)에 따른 **조건부 라우팅**과 **품질 검토 루프**를 갖추고 있어, 이를 `pipeline.py`에 이식하는 것이 이번 고도화의 핵심 방향이다.

### 현행 노드별 역할 요약

| 노드 | 역할 | LLM 호출 |
|---|---|---|
| `content_validator` | 광고 필터링, quality_score 계산, 리뷰 정제 | ❌ |
| `llm_analyzer` | Gemini 호출 → aspect_scores / keywords / summary 추출 | ✅ |
| `keyword_extractor` | LLM 키워드 정규화, fallback 키워드 보완 | ❌ |
| `result_saver` | DB 저장 (AIAnalysisResult, SentimentAspectScore, RestaurantKeyword, WordCloud) | ❌ |

---

## 2. 고도화 설계 방향 (3가지 핵심)

### 2-1. 리뷰 볼륨 기반 조건부 라우팅

`content_validator` 이후 리뷰 수량 및 위험 키워드 유무에 따라 분석 노드를 동적으로 선택한다.

| 조건 | 라우팅 대상 | 이유 |
|---|---|---|
| 위생 위반·폐업 키워드 감지 | `issue_handler` | 관리자 검토 필요, 즉시 저장 처리 |
| 클린 리뷰 5개 미만 | `creative_analyzer` | 데이터 부족 → LLM 추론 비중 강화 |
| 클린 리뷰 5개 이상 | `standard_analyzer` | 일반 분석 경로 |

### 2-2. LLM 출력 품질 검토 루프

`llm_analyzer` 직후에 품질 검증 노드를 삽입하여, 스키마 누락이나 공백 summary가 발생했을 때 자동 재시도한다.

| 검증 항목 | 기준 |
|---|---|
| 필수 11개 aspect 존재 여부 | `soup`, `spiciness`, `fire`, `noodle`, `topping`, `quantity`, `price`, `waiting`, `hygiene`, `service`, `return_intent` 모두 존재해야 함 |
| 점수 범위 | 각 점수가 0~100 사이여야 함 |
| summary 공백 여부 | 비어 있으면 재시도 대상 |
| 재시도 상한 | `revision_count < 2` (최대 2회 후 강제 통과) |

### 2-3. 이슈 매장 플래그 처리

리뷰 내 위험 키워드 감지 시 일반 분석 경로를 우회하여 관리자 대시보드 알림 상태로 즉시 저장한다.

감지 키워드 예시: `"식중독"`, `"고발"`, `"위생과"`, `"바퀴벌레"`, `"폐업"`

---

## 3. 목표 아키텍처 워크플로우

```
[START]
  │
  ▼
content_validator
  │
  ▼
route_by_volume (Conditional Edge)
  ├── issue_flagged ──────────────────────────────────► issue_handler ──► result_saver ──► [END]
  ├── creative_fallback ──► creative_analyzer ──┐
  └── standard ──────────► standard_analyzer ──┤
                                                ▼
                                        check_output_quality (Conditional Edge)
                                          ├── retry ──► retry_llm_analyzer ──┐
                                          │                                   │ (순환)
                                          └── approve                        │
                                                │◄──────────────────────────┘
                                                ▼
                                        keyword_extractor
                                                │
                                                ▼
                                          result_saver
                                                │
                                                ▼
                                             [END]
```

---

## 4. 코드 설계 가이드

### 4-1. AnalysisState 확장

```python
class AnalysisState(TypedDict, total=False):
    # 기존 필드
    restaurant_id: str
    reviews: list[dict[str, Any]]
    aspect_scores: dict[str, int]
    aspect_summaries: dict[str, str]
    keywords: list[dict[str, Any]]
    summary: str
    review_count: int
    blog_score: int
    analysis_id: str

    # 고도화 추가 필드 (main.py 패턴 이식)
    route: str            # "standard" | "creative_fallback" | "issue_flagged"
    revision_count: int   # LLM 재시도 횟수
    is_valid_format: bool # 출력 포맷 무결성 여부
    feedback_notes: str   # 재시도 시 LLM에 전달할 피드백 메모
```

### 4-2. 라우팅 함수

```python
def route_by_volume(self, state: AnalysisState) -> str:
    reviews = state.get("reviews", [])
    text_corpus = " ".join([r.get("content", "") for r in reviews])

    # 위험 키워드 감지 시 이슈 플래그 경로
    if any(kw in text_corpus for kw in ["식중독", "고발", "위생과", "바퀴벌레", "폐업"]):
        return "issue_flagged"

    # 리뷰 부족 시 창의적 추론 노드
    if len(reviews) < 5:
        return "creative_fallback"

    return "standard"
```

### 4-3. 품질 검증 함수

```python
def check_output_quality(self, state: AnalysisState) -> str:
    scores = state.get("aspect_scores", {})
    summary = state.get("summary", "")

    required_aspects = [
        "soup", "spiciness", "fire", "noodle", "topping",
        "quantity", "price", "waiting", "hygiene", "service", "return_intent"
    ]
    is_scores_complete = all(aspect in scores for aspect in required_aspects)
    scores_in_range = all(0 <= v <= 100 for v in scores.values())

    if (not is_scores_complete or not scores_in_range or not summary):
        if state.get("revision_count", 0) < 2:
            return "retry"

    return "approve"
```

### 4-4. build_graph() 고도화 조립

```python
def build_graph(self):
    from langgraph.graph import END, START, StateGraph

    workflow = StateGraph(AnalysisState)

    # 노드 선언
    workflow.add_node("content_validator", self.content_validator)
    workflow.add_node("standard_analyzer", self.standard_analyzer)
    workflow.add_node("creative_analyzer", self.creative_analyzer)
    workflow.add_node("issue_handler", self.issue_handler)
    workflow.add_node("check_quality", self.check_output_quality_node)
    workflow.add_node("retry_analyzer", self.retry_analyzer)
    workflow.add_node("keyword_extractor", self.keyword_extractor)
    workflow.add_node("result_saver", self.result_saver)

    # 진입점
    workflow.add_edge(START, "content_validator")

    # 볼륨 기반 동적 라우팅
    workflow.add_conditional_edges(
        "content_validator",
        self.route_by_volume,
        {
            "standard": "standard_analyzer",
            "creative_fallback": "creative_analyzer",
            "issue_flagged": "issue_handler",
        }
    )

    # 분석 노드 → 품질 검증 (LLM 직후에 배치)
    workflow.add_edge("standard_analyzer", "check_quality")
    workflow.add_edge("creative_analyzer", "check_quality")

    # 이슈 매장은 품질 검증 없이 즉시 저장
    workflow.add_edge("issue_handler", "result_saver")

    # 품질 검토 루프
    workflow.add_conditional_edges(
        "check_quality",
        self.route_quality_check,
        {
            "retry": "retry_analyzer",
            "approve": "keyword_extractor",
        }
    )

    # 재시도 후 다시 품질 검증으로 순환
    workflow.add_edge("retry_analyzer", "check_quality")

    # 품질 통과 후 정상 흐름
    workflow.add_edge("keyword_extractor", "result_saver")
    workflow.add_edge("result_saver", END)

    return workflow.compile()
```

---

## 5. 코드 점검 결과: 기획서 vs 실제 코드 불일치 사항

### 🔴 [Critical] 품질 루프 위치 오류

**기획서 설계:** `keyword_extractor` 뒤에 `check_output_quality` 배치  
**실제 문제:** `keyword_extractor`는 LLM을 전혀 호출하지 않는 순수 정규화 노드  

```python
# keyword_extractor 실제 구현 — LLM 없음, 단순 후처리만 수행
def keyword_extractor(self, state: AnalysisState) -> AnalysisState:
    for item in raw_keywords:
        keyword = str(item.get("keyword", "")).strip()
        normalized.append({ ... })
```

LLM 출력의 포맷 오류(`aspect_scores` 누락, `summary` 공백)는 **`llm_analyzer` 직후**에 잡아야 한다.  
`keyword_extractor` 이후에 배치하면 `retry_analyzer → keyword_extractor` 순환이 불필요하게 반복된다.

**수정:** `check_output_quality`를 `llm_analyzer(또는 standard/creative_analyzer)` 바로 뒤로 이동

---

### 🔴 [Critical] `content_validator`의 `ValueError` 처리 방식

**현재 코드:**
```python
if not reviews:
    raise ValueError(f"No usable reviews found for restaurant {restaurant.id}.")
```

`ValueError`를 raise하면 LangGraph 그래프 실행 자체가 중단되어 `route_by_volume`으로 분기가 불가하다.  
리뷰 0개를 `issue_flagged`나 별도 경로로 처리하려면 예외 대신 state를 반환해야 한다.

**수정 방향:**
```python
# 예외 대신 state 반환 → route_by_volume에서 0개 케이스 처리
return {"reviews": reviews, "review_count": len(reviews)}
# route_by_volume에서 len(reviews) == 0 이면 "issue_flagged" 반환
```

---

### 🟡 [Warning] `with_structured_output` 도입 권고 — 이미 구현됨

기획서에서 "Pydantic `with_structured_output`을 바인딩하면 포맷 에러 확률을 줄일 수 있다"고 제안하고 있으나, 실제 `pipeline.py`에는 이미 JSON Schema 기반 `with_structured_output`이 구현되어 있다.

```python
# pipeline.py — create_structured_gemini_model() 이미 구현됨
model = ChatGoogleGenerativeAI(model=model_name, temperature=0.2, max_retries=2)
return model.with_structured_output(schema=schema, method="json_schema")
```

기획서의 해당 권고는 **"기구현됨"으로 표시**하거나 삭제가 필요하다.

---

### 🟡 [Warning] `revision_count` 상한 초과 시 처리 방침 미명시

현재 기획서의 `check_output_quality`는 `revision_count < 2` 조건 초과 시 `"approve"`로 강제 통과시키는 구조이다.  
운영 관점에서 **상한 초과 시 어떻게 처리할지 명시**가 필요하다.

선택지:
- `"approve"`로 강제 통과 후 `feedback_notes`에 경고 메모 기록
- `"issue_flagged"`로 분기하여 관리자 검토 큐에 적재
- `result_saver`에서 `status=PARTIAL` 등 별도 상태로 저장

---

### 🟢 [Good] 잘 설계된 부분

- 이슈 키워드 감지 → `is_visible=False` 처리 또는 관리자 대시보드 분류 방향은 운영 관점에서 타당하다.
- `route_by_volume`에서 리뷰 수와 위험 키워드를 동시에 검사하는 구조가 간결하고 명확하다.
- `standard_analyzer`와 `creative_analyzer`를 분리하되 `keyword_extractor`로 합류시키는 흐름은 코드 재사용성이 높다.
- `issue_handler → result_saver` 직행 처리(키워드 추출 스킵)는 불필요한 LLM 토큰 낭비를 방지한다.
- `main.py`의 `revision_count` 상한 체크 패턴이 기획서에 올바르게 이식되었다.

---

## 6. 추가 개선 권고 사항

### `build_graph()` 내 PNG 저장 코드

```python
# 현재: 모든 요청마다 agent_graph.png 덮어쓰기
with open("agent_graph.png", "wb") as f:
    f.write(agent_graph.get_graph().draw_mermaid_png())
```

Django 서버 운영 중에는 요청마다 파일을 덮어쓰는 문제가 발생한다.  
`settings.DEBUG` 조건으로 개발 환경에서만 실행되도록 분기 권장.

```python
import django.conf
if django.conf.settings.DEBUG:
    try:
        with open("agent_graph.png", "wb") as f:
            f.write(agent_graph.get_graph().draw_mermaid_png())
    except Exception:
        pass
```

### `get_restaurant()` 중복 DB 쿼리

`content_validator`, `llm_analyzer`, `result_saver` 세 노드에서 각각 `get_restaurant()`를 호출하고 있다.  
`content_validator`에서 1회 조회 후 state에 restaurant 정보를 캐싱하거나, `select_related`를 활용한 단일 쿼리 최적화를 권장한다.

### `main.py`의 존재하지 않는 모델명

```python
# main.py
GEMINI_MODEL = "gemini-3.1-flash-lite"  # ❌ 존재하지 않는 모델명
```

2026년 6월 기준 실존 모델명으로 수정이 필요하다.  
예: `"gemini-2.5-flash"` 또는 `"gemini-2.0-flash"`

---

## 7. 최종 점검 체크리스트

| 항목 | 상태 | 조치 필요 |
|---|---|---|
| 조건부 라우팅(볼륨 기반) 방향 | ✅ 맞음 | - |
| 품질 루프 위치 (`keyword_extractor` 뒤) | ❌ 오류 | `llm_analyzer` 뒤로 이동 |
| `content_validator`의 `raise` 처리 | ❌ 오류 | state 반환 방식으로 전환 |
| `with_structured_output` 도입 권고 | ⚠️ 기구현됨 | 기획서에서 "기구현" 명시 또는 삭제 |
| `revision_count` 상한 초과 처리 | ⚠️ 미명시 | 처리 방침 명문화 필요 |
| 이슈 플래그 감지 및 우회 처리 | ✅ 설계 타당 | - |
| `build_graph()` PNG 저장 코드 | ⚠️ 운영 위험 | DEBUG 조건 분기 추가 |
| `get_restaurant()` 중복 쿼리 | ⚠️ 성능 | 캐싱 또는 단일 조회로 최적화 |
| `main.py` 모델명 오류 | ⚠️ 런타임 에러 위험 | 실존 모델명으로 수정 |
