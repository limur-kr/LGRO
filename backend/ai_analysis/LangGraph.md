# LGRO 프로젝트 — LangGraph 파이프라인 설계 검토서

> 최초 작성: 2026-06-16
> 개정: 2026-07-08 — 초안에서 제안했던 항목들이 `pipeline.py`에 실제로 반영되었는지 재검증하고, 모델명 관련 오판을 정정함.
> 대상 파일: `ai_analysis/pipeline.py`, `ai_analysis/management/commands/run_analysis.py`

---

## 1. 현재 구현 상태 요약

최초 검토 시점에는 `pipeline.py`가 아래와 같은 완전 직선형 구조였다.

```
[START] → content_validator → llm_analyzer → keyword_extractor → result_saver → [END]
```

2026-07-08 기준 `pipeline.py`는 조건부 라우팅 + 품질 검토 루프가 이미 적용된 상태다. 이번 개정에서는 초안의 개선 제안이 실제로 반영됐는지 코드 기준으로 재검증했고, 대부분 **이미 해결된 상태**임을 확인했다.

### 노드별 역할 (현행)

| 노드 | 역할 | LLM 호출 |
|---|---|---|
| `content_validator` | 광고 필터링, quality_score 계산, 라우팅 결정(`determine_route`) | ❌ |
| `standard_analyzer` / `creative_analyzer` | Gemini 호출 → aspect_scores / keywords / summary 추출 | ✅ |
| `issue_handler` | 위험 키워드 감지 시 분석 우회, 관리자 검토용 상태 기록 | ❌ |
| `check_quality` (`check_output_quality_node`) | 출력 스키마 검증, 재시도 여부 판단 | ❌ |
| `retry_analyzer` | 품질 검증 실패 시 피드백 포함 재호출 | ✅ |
| `keyword_extractor` | 키워드 정규화, fallback 키워드 보완 | ❌ |
| `result_saver` | DB 저장 (`AIAnalysisResult`, `SentimentAspectScore`, `RestaurantKeyword`, `WordCloudResult`) | ❌ |

---

## 2. 실제 아키텍처 워크플로우

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
                                        check_quality (Conditional Edge)
                                          ├── retry ──► retry_analyzer ──┐
                                          │                                │ (순환)
                                          └── approve                     │
                                                │◄─────────────────────────┘
                                                ▼
                                          keyword_extractor
                                                │
                                                ▼
                                          result_saver
                                                │
                                                ▼
                                             [END]
```

`content_validator`는 `determine_route()`를 통해 `route`(`standard`/`creative_fallback`/`issue_flagged`)와 `issue_reason`을 함께 계산해 state에 반환한다. 리뷰가 0개인 경우도 예외를 던지지 않고 `issue_flagged`로 라우팅된다(`pipeline.py:426-437`).

---

## 3. 초안 대비 점검 결과 (2026-07-08 재검증)

### ✅ 품질 루프 위치 — 해결됨

초안에서는 `check_output_quality`가 `keyword_extractor` 뒤에 배치될 위험을 지적했으나, 실제 `build_graph()`는 `standard_analyzer`/`creative_analyzer` 직후에 `check_quality`를 연결하고, 통과한 뒤에만 `keyword_extractor`로 넘어간다(`pipeline.py:132-141`). 불필요한 순환 없이 올바르게 구현되어 있다.

### ✅ `content_validator`의 예외 처리 — 해결됨

`content_validator`는 `ValueError`를 raise하지 않는다. 리뷰가 없거나 위험 키워드가 감지되면 `determine_route()`가 `issue_flagged`를 반환하고, `content_validator`는 정상적으로 state를 반환해 그래프가 계속 진행된다(`pipeline.py:227-235`, `426-437`).

### ✅ `with_structured_output` — 이미 구현됨

`create_structured_gemini_model()`이 JSON Schema 기반 `with_structured_output(method="json_schema")`을 이미 사용 중이다(`pipeline.py:448-494`).

### ✅ `revision_count` 상한 초과 처리 — 명시됨

`route_quality_check()`는 `revision_count >= MAX_REVISION_COUNT(2)`이면 강제로 `approve`를 반환하고, `result_saver()`는 `is_valid_format`이 `False`인 경우 `feedback_notes`를 `error_message`에 기록한다(`pipeline.py:308-313`, `355-362`). 상태를 별도 `PARTIAL`로 분리하지는 않지만, "강제 통과 + 경고 메모 기록" 방침이 이미 코드로 정착되어 있다.

### ✅ `build_graph()` PNG 저장 코드 — 해결됨(초안보다 안전)

`_write_debug_graph_png()`가 `WRITE_LANGGRAPH_PNG` 환경변수와 `settings.DEBUG`를 모두 확인한 뒤에만 파일을 쓰고, 예외도 무시한다(`pipeline.py:151-166`). 매 요청마다 프로덕션에서 파일을 덮어쓰는 문제는 없다.

### ✅ `get_restaurant()` 중복 쿼리 — 해결됨

`JjambbongAnalysisPipeline`이 `self._restaurant_cache`로 파이프라인 인스턴스 내에서 식당 조회를 캐싱한다(`pipeline.py:100`, `179-183`). `content_validator`/`run_llm_analysis`/`result_saver`가 모두 이 캐시를 경유한다.

### ❌ 모델명 — 초안의 판단이 틀렸음 (정정)

초안은 `main.py`에 `GEMINI_MODEL = "gemini-3.1-flash-lite"`가 "존재하지 않는 모델명"이라고 지적했다. 두 가지가 잘못됐다.

1. **참조 위치 오류**: `backend/main.py`는 `uv init` 스캐폴드 스텁(`print("Hello from backend!")`)일 뿐 LangGraph와 무관하다. 실제 기본값은 `pipeline.py:99`의 `os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")`에 있다.
2. **모델 존재 여부 오판**: `gemini-3.1-flash-lite`는 2026년 3월 3일 GA로 출시된 실존 모델이며([Google 발표](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/)), `gemini-2.5-flash`와 동급 품질을 더 낮은 가격·더 빠른 속도로 제공한다. 자세한 비교는 [4장](#4-모델-선택-검토) 참고.

**결론: 코드는 수정할 필요 없다.** 대신 아래 새 불일치를 고쳐야 한다.

### ✅ `run_analysis.py` 도움말 문자열 불일치 — 해결됨

실제 기본값은 `pipeline.py`의 `gemini-3.1-flash-lite`인데 도움말에는 `gemini-2.5-flash`로 적혀 있던 불일치를 수정했다(`run_analysis.py:17-20`).

```python
parser.add_argument(
    "--model", default=None,
    help="Gemini model name. Defaults to GEMINI_MODEL env var or gemini-3.1-flash-lite.",
)
```

---

## 4. 모델 선택 검토

`gemini-3.1-flash-lite`는 Gemini 3 시리즈 중 가장 저렴하고 빠른 모델로, 고빈도·저지연·비용민감 구조화 추출 워크로드에 최적화되어 있다. 이 파이프라인이 하는 일(리뷰 텍스트 → 고정 JSON 스키마로 점수/키워드 추출)이 정확히 이 범주에 해당한다.

| 모델 | 입력/출력 가격 (1M 토큰) | 비고 |
|---|---|---|
| **gemini-3.1-flash-lite** (현재 기본값) | $0.25 / $1.50 | `gemini-2.5-flash`와 동급 품질, TTFT 2.5배 빠름, 출력 속도 45%↑ |
| gemini-2.5-flash | $0.30 / $2.50 | 구세대. 3.1-flash-lite보다 비싸고 느림 |
| gemini-2.0-flash | 2.5-flash보다 저렴 | 구세대. 품질이 3.1-flash-lite보다 낮음 |

`langchain-google-genai`(현재 lock 버전 `4.2.5`)는 `gemini-3.1-flash-lite`에 대한 JSON Schema 구조화 출력(`with_structured_output(method="json_schema")`)을 정식 지원한다.

**결론: 현재 기본값(`gemini-3.1-flash-lite`)이 세 모델 중 최선이며 그대로 유지한다.** 비용·속도·품질 모두 `gemini-2.5-flash`/`gemini-2.0-flash`보다 우위에 있어, 이 두 모델로의 "다운그레이드"는 불필요하다.

---

## 5. 최종 점검 체크리스트

| 항목 | 상태 |
|---|---|
| 조건부 라우팅(볼륨 기반) | ✅ 구현됨 |
| 품질 루프 위치 (analyzer 직후) | ✅ 구현됨 |
| `content_validator`의 예외 처리 | ✅ 해결됨 (state 반환 방식) |
| `with_structured_output` 도입 | ✅ 구현됨 |
| `revision_count` 상한 초과 처리 | ✅ 구현됨 (강제 approve + feedback_notes 기록) |
| 이슈 플래그 감지 및 우회 처리 | ✅ 구현됨 |
| `build_graph()` PNG 저장 코드 | ✅ 해결됨 (env var + `DEBUG` 가드) |
| `get_restaurant()` 중복 쿼리 | ✅ 해결됨 (인스턴스 캐싱) |
| 파이프라인 기본 모델명 (`pipeline.py`) | ✅ 정상 (`gemini-3.1-flash-lite`는 실존 최신 모델) |
| `run_analysis.py` 도움말 문자열 | ✅ 해결됨 (`gemini-2.5-flash` → `gemini-3.1-flash-lite`) |
