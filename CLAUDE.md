# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 살아있는 문서입니다.
상단은 **현재 프로젝트 스냅샷**(구조 파악용), 하단은 **고도화 작업 로그**(날짜별 설계·진행 기록)입니다.
새 작업을 시작할 때마다 로그 섹션에 날짜별로 이어서 추가하세요. `PROJECT.md`, `BACKEND_READ.md`는 이전 기획(FestMoment/축제) 단계 문서라 지금 구조와 다릅니다 — 참고만 하고 신뢰하지 마세요.

---

## 1. 프로젝트 스냅샷 (2026-07-09 기준)

**LGRO — AI 짬뽕 맛집 지도.** Django REST 백엔드 + React(Vite) 프론트엔드. 축제 안내 서비스였던 FestMoment 기획에서 전면 피벗해, 지금은 짬뽕 맛집 검색·리뷰 감성분석·지도·커뮤니티 서비스입니다.

### 스택
- Backend: Django 5.2 + DRF + simplejwt, `backend/pyproject.toml` 기준. Celery/Redis/FastAPI 없음.
- AI: LangGraph + `langchain-google-genai`(Gemini). `backend/ai_analysis/pipeline.py`의 `JjambbongAnalysisPipeline` 하나가 유일한 에이전트 그래프.
- DB: 기본 SQLite(`db.sqlite3`), `DATABASE_URL` 있으면 PostgreSQL.
- Frontend: React 19 + TypeScript + Vite + react-router-dom + zustand + TanStack Query + Tailwind (`frontend/src`). `frontend_legacy/`, `README.md`가 언급하는 vanilla-JS/`main.html` 구조는 이미 대체된 옛 버전.
- 배포: `docker/` 디렉토리는 비어 있음. Dockerfile/nginx/compose 없음.

### 백엔드 앱 (`backend/`)
| 앱 | 역할 |
|---|---|
| `accounts` | 커스텀 User, JWT 인증, Google/Kakao OAuth(`social_auth.py`), `IsServiceAdmin` 권한 |
| `restaurants` | `Region`, `JjambbongRestaurant`, `RestaurantMenu`, `RestaurantImage`, `UserFavorite` |
| `reviews` | `ReviewSource` (Naver 블로그 리뷰 수집 — 공식 Search API, 스크래핑 아님) |
| `ai_analysis` | `AIAnalysisResult`, `SentimentAspectScore`, `RestaurantKeyword`, `WordCloudResult`, LangGraph 파이프라인, 관리자 job 트리거 API |
| `community` | `Question`/`Answer` — Q&A와 "맛집 제보"를 겸함(`restaurant_name`/`linked_restaurant` 필드로 구분) |
| `analytics` | `VisitLog`, `SearchKeyword`, `SearchLog` + `/api/analytics/summary` (방문·검색 집계, 관리자 전용) |

### 프론트엔드 라우트 (`frontend/src/App.tsx`)
`/`(MainPage), `/ranking`, `/search`, `/restaurants/:id`, `/map`(카카오맵), `/report`(맛집 제보), `/account`, `/admin`. 로그인/회원가입은 모달(`AuthModal`)이고 별도 페이지 없음.

### AI 분석 파이프라인 (`backend/ai_analysis/pipeline.py`)
```
content_validator → (route) → standard_analyzer / creative_analyzer / issue_handler
standard/creative_analyzer → check_quality → (retry_analyzer ↺ | keyword_extractor) → result_saver
```
Gemini 구조화 출력(JSON Schema)으로 11개 항목 감성 점수 + 키워드 + 요약 생성. `WordCloudResult.keywords`만 채워지고 `image`/`image_url` 필드는 지금 아무도 쓰지 않음(생성 로직 없음).

### 관리자 대시보드 (`frontend/src/routes/AdminPage.tsx`)
현재 있는 것: 맛집 제보 승인 큐, 사진 등록 승인 큐, 리뷰수집/AI분석 job 트리거(폴링 로그 표시).
**없는 것**: `analytics/summary` API가 이미 있는데도 화면에 안 붙어 있음. 피드백 수집 모델/API 자체가 없음. Q&A 통계(대기/답변/제보 건수 등) 집계 뷰가 없음.

---

## 2. 고도화 작업 로그

### 2026-07-09 — 관리자 대시보드/피드백/워드클라우드 설계

**배경**: FestMoment 기획(`PROJECT.md`) 대비 기능 갭을 조사한 결과, 아래 3가지가 "이미 있는 인프라를 조금만 확장하면 되는" 우선순위로 확정됨. 각 항목은 독립적으로 구현 가능 — 순서는 아래 번호 순 추천(3 → 2 → 1 순으로도 무방).

#### (A) 관리자 대시보드 통계 강화 — 완료 (2026-07-09)

**현황**: `analytics.AnalyticsSummaryAPIView`(`/api/analytics/summary/`)가 방문·검색 집계를 이미 반환하지만 `AdminPage.tsx`가 이 API를 아예 호출하지 않음. Q&A/제보/피드백 집계는 어디에도 없음.

**완료 내역**: 설계와 달리 `analytics` 앱을 건드리지 않고, `QuestionViewSet.stats`(`/api/questions/stats/`)와 `FeedbackViewSet.stats`(`/api/feedback/stats/`)를 각 앱에 독립적으로 추가해 교차 의존성을 피함. 프론트 `hooks/useAdminStats.ts`(3개 `useQuery` 병렬 호출) + `components/admin/StatsSummarySection.tsx`를 `AdminPage.tsx` 최상단에 배치. 브라우저에서 실데이터(방문 596건, 검색 17건 등)로 렌더링 확인 완료.

**설계**:
1. `AnalyticsSummaryAPIView`에 다음을 추가로 합치거나, `community` 앱에 `QnAStatsAPIView`를 새로 만들어 관리자 화면에서 병렬 호출:
   - `Question` 상태별 건수(`OPEN`/`ANSWERED`/`CLOSED`), 제보(`restaurant_name` 비어있지 않은 것) 대기 건수, 최근 N일 유입 추이.
   - (B)에서 만들 `Feedback` 모델이 생기면 카테고리별 건수·최근 목록도 합류.
2. 프론트: `AdminPage.tsx` 최상단에 `StatsSummarySection` 컴포넌트 추가 — `useQuery`로 `/api/analytics/summary/`(+ QnA 통계) 호출, 숫자 카드형 UI(오늘 방문/검색, 대기 중 제보, 대기 중 피드백 등)로 표시. 기존 `ReportQueueSection`/`PhotoQueueSection` 위에 배치.
3. 권한은 기존 `IsServiceAdmin`/`IsAdminUser` 패턴 그대로 재사용.

**영향 파일**: `backend/analytics/views.py`(또는 `community/views.py` 신규 뷰), `backend/community/urls.py`, `frontend/src/routes/AdminPage.tsx`, `frontend/src/api/endpoints.ts`, `frontend/src/hooks/`(신규 훅).

#### (B) 피드백 수집 신규 기능 — 완료 (2026-07-09)

**현황**: 피드백 모델/엔드포인트 자체가 없음. FestMoment의 `feedback`/`feature_ratings` 테이블에 해당하는 것이 하나도 없음.

**완료 내역**: 설계대로 구현. `community.Feedback` 모델(`0003_feedback` 마이그레이션), `FeedbackCreateSerializer`/`FeedbackSerializer`, `FeedbackViewSet`(`/api/feedback/`, `/api/feedback/{id}/resolve/`, `/api/feedback/stats/`), 프론트 `FeedbackWidget.tsx`(전역, `Layout.tsx`에 배치, 좌하단 트리거) + `hooks/useFeedback.ts` + `AdminPage.tsx`의 `FeedbackQueueSection`. Playwright로 익명 제출 → 관리자 큐 노출 → 해결 처리까지 브라우저에서 직접 검증 완료.

**설계**:
1. 모델(`community/models.py`에 추가, Q&A와 인접한 도메인이라 새 앱을 만들지 않고 여기 배치): 
   ```python
   class Feedback(models.Model):
       CATEGORY_BUG = "BUG"
       CATEGORY_SUGGESTION = "SUGGESTION"
       CATEGORY_PRAISE = "PRAISE"
       CATEGORY_OTHER = "OTHER"
       CATEGORY_CHOICES = (...)

       id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
       user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="feedbacks")
       category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default=CATEGORY_OTHER)
       message = models.TextField()
       page_path = models.CharField(max_length=512, blank=True)
       rating = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5, optional
       is_resolved = models.BooleanField(default=False)
       created_at = models.DateTimeField(auto_now_add=True)
   ```
2. API: `POST /api/feedback/`(`AllowAny`, 익명 제출 가능 — `user`는 로그인 시에만 채움), `GET /api/admin/feedback/`(`IsServiceAdmin`, 목록+필터), `PATCH /api/admin/feedback/{id}/`(해결 처리).
3. 프론트: 우측 하단 플로팅 버튼(기존 `ReportFab.tsx` 패턴 재사용) 또는 기존 FAB 옆에 "피드백 보내기" 모달. 카테고리 선택 + 텍스트 입력만 있는 짧은 폼.
4. 마이그레이션 1개 추가(`community` 앱).

**영향 파일**: `backend/community/models.py`, `serializers.py`, `views.py`, `urls.py`, 새 마이그레이션, `frontend/src/components/FeedbackModal.tsx`(신규), `frontend/src/api/endpoints.ts`, `AdminPage.tsx`(목록 섹션 추가).

#### (C) 워드클라우드 실제 이미지 생성

**현황**: `WordCloudResult.image`/`image_url` 필드는 있지만 아무 코드도 채우지 않음. `pipeline.py`의 `result_saver`가 `keywords` 리스트만 저장(`pipeline.py:398-402`). `wordcloud`/`matplotlib` 의존성 없음, 한글 폰트 파일도 저장소에 없음.

**설계**:
1. 의존성 추가: `wordcloud`, `matplotlib` (`backend/pyproject.toml`). Pillow는 이미 있음.
2. 한글 렌더링을 위해 오픈소스 한글 폰트(예: Noto Sans KR 또는 Pretendard, OFL 라이선스) 1개를 `backend/ai_analysis/fonts/`에 커밋하고 `font_path`로 지정 — 안 하면 한글이 네모(tofu)로 깨짐.
3. `pipeline.py`에 헬퍼 함수 추가, 예:
   ```python
   def render_wordcloud_image(keywords: list[dict]) -> ContentFile:
       freqs = {k["keyword"]: max(1, k["frequency"]) * (0.5 + k["weight"]) for k in keywords}
       wc = WordCloud(font_path=FONT_PATH, width=800, height=450, background_color="white").generate_from_frequencies(freqs)
       buf = BytesIO()
       wc.to_image().save(buf, format="PNG")
       return ContentFile(buf.getvalue(), name=f"wordcloud_{uuid4().hex}.png")
   ```
4. `result_saver`에서 `keywords`가 5개 이상일 때 위 함수 호출 → `WordCloudResult.image.save(...)`로 저장(`update_or_create` 이후 `defaults`에 추가하거나 별도 `.save()` 호출).
5. 실패해도 전체 분석은 성공해야 함 — `try/except`로 감싸고 실패 시 `image`는 비워둔 채 `keywords`만 저장(현재 동작 유지).
6. 프론트: 이미 `WordCloudResult`를 쓰는 화면(맛집 상세)이 있으면 `image_url` 우선 표시로 교체. 없으면 이번 범위에서는 백엔드 생성까지만 하고 노출은 별도 후속 작업으로 미뤄도 됨 — 진행 시 사용자와 확인.

**영향 파일**: `backend/pyproject.toml`, `backend/ai_analysis/pipeline.py`, `backend/ai_analysis/fonts/`(신규 폰트 파일), 프론트 상세 페이지(필요 시).

---

### 작업 기록 규칙
- 새 작업을 시작하면 `## 2. 고도화 작업 로그`에 `### YYYY-MM-DD — 제목` 형식으로 이어서 추가.
- 설계만 하고 구현 전이면 "설계"로, 구현 완료 후엔 같은 항목에 "완료" 상태와 실제 변경 파일/커밋 해시를 덧붙여 갱신.
- 완료된 항목이 오래돼서 더 이상 참고할 필요 없으면 상단 "1. 프로젝트 스냅샷"에만 남기고 로그에서는 정리(삭제) 가능.
