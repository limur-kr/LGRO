# 추천 진행 순서

```
1. 기획/범위 확정
2. ERD 확정
3. API 명세 초안 작성
4. 프로젝트 초기 세팅
5. DB 모델 구축
6. 백엔드 기본 API 구축
7. 프론트엔드 기본 화면 구축
8. 프론트-백 연결
9. AI 분석/크롤링 기능 붙이기
10. 관리자/배포/리팩토링
```

핵심은 **DB → 백엔드 → 프론트엔드**가 아니라,

**ERD/API 계약 → 백엔드 기본 골격 + 프론트 화면 병렬 → 연결**입니다.

---

# 1단계. 기획과 MVP 범위 먼저 확정

처음부터 모든 기능을 만들면 망하기 쉽습니다.

먼저 MVP를 작게 잡는 게 좋습니다.

## 1차 MVP 추천 범위

```
- 지역별 짬뽕 맛집 목록
- 맛집 검색
- 맛집 상세 페이지
- 메뉴 정보
- AI 리뷰 요약 결과 조회
- 항목별 감성 점수
- 워드클라우드
- 로그인/회원가입
- 찜 기능
- 관리자에서 맛집 등록/수정
```

## 1차에서 미뤄도 되는 기능

```
- 사용자 방문 기록
- 고도화된 추천 알고리즘
- 지도 기반 주변 코스 추천
- 실시간 크롤링
- 랭킹 자동 스냅샷
- AI 이미지 렌더링
- 복잡한 관리자 통계
```

처음에는 “짬뽕 맛집을 찾고, 상세에서 AI 분석을 볼 수 있다”까지만 완성하는 게 좋습니다.

---

# 2단계. ERD 확정

이 단계에서 테이블을 전부 만들 필요는 없습니다.

대신 **1차 MVP에 필요한 테이블만 먼저 확정**합니다.

## MVP용 필수 테이블

```
regions
jjambbong_restaurants
restaurant_menus
restaurant_images
review_sources
ai_analysis_results
sentiment_aspect_scores
restaurant_keywords
wordcloud_results
users
refresh_tokens
user_favorites
questions
answers
```

## 나중에 추가할 테이블

```
restaurant_reports
user_visits
recommendation_logs
ranking_snapshots
feedback
feature_ratings
user_events
tags
restaurant_tags
```

실무에서도 처음부터 완벽한 ERD를 고정하지 않습니다.

대신 **핵심 테이블은 신중하게**, 부가 기능 테이블은 나중에 마이그레이션으로 추가합니다.

---

# 3단계. API 명세 먼저 작성

프론트와 백엔드를 연결하려면 API 약속이 먼저 있어야 합니다.

예를 들면 이런 식입니다.

```
GET    /api/regions/
GET    /api/restaurants/
GET    /api/restaurants/{id}/
GET    /api/restaurants/{id}/menus/
GET    /api/restaurants/{id}/sentiment/
GET    /api/restaurants/{id}/wordcloud/
POST   /api/restaurants/{id}/favorite/
DELETE /api/restaurants/{id}/favorite/

POST   /api/auth/register/
POST   /api/auth/login/
POST   /api/auth/refresh/
GET    /api/auth/me/

GET    /api/questions/
POST   /api/questions/
GET    /api/questions/{id}/
```

이걸 먼저 정해두면 프론트는 백엔드가 완성되기 전에도 **mock data**로 작업할 수 있고, 백엔드는 프론트 구조를 보면서 API 응답 형태를 맞출 수 있습니다.

---

# 4단계. 빈 폴더에서 프로젝트 세팅

추천 구조는 프론트와 백엔드를 같은 루트에 두는 방식입니다.

```
jjambbong-map/
├── backend/
│   ├── manage.py
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── config/
│   └── apps/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│
├── docker/
├── docs/
│   ├── ERD.md
│   ├── API.md
│   └── MVP.md
│
├── .gitignore
├── README.md
└── docker-compose.yml
```

이렇게 하면 나중에 Docker, 배포, 문서 관리가 편합니다.

---

# 5단계. 백엔드 Django + uv 세팅

먼저 백엔드를 세팅합니다.

```bash
mkdir jjambbong-map
cd jjambbong-map

mkdir backend
cd backend

uv init
uv add django djangorestframework djangorestframework-simplejwt psycopg[binary] django-cors-headers python-dotenv pillow
uv run django-admin startproject config .
```

앱 생성:

```bash
uv run python manage.py startapp accounts
uv run python manage.py startapp restaurants
uv run python manage.py startapp reviews
uv run python manage.py startapp ai_analysis
uv run python manage.py startapp community
uv run python manage.py startapp analytics
```

실행 확인:

```bash
uv run python manage.py runserver
```

---

# 6단계. Django 설정 정리 0614 시작

`settings.py`에서 우선 아래를 설정합니다.

```python
INSTALLED_APPS = [
    # django 기본 앱
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # third-party
    "rest_framework",
    "corsheaders",

    # local apps
    "accounts",
    "restaurants",
    "reviews",
    "ai_analysis",
    "community",
    "analytics",
]
```

처음에는 SQLite로 빠르게 시작해도 됩니다.

하지만 이 프로젝트는 검색, JSONField, 좌표, 인덱스, 관리자 운영까지 고려하면 최종적으로는 PostgreSQL이 좋습니다.

실무에서는 보통 이렇게 갑니다.

```
초기 개발 1~2일: SQLite 가능
본격 모델 작성 이후: PostgreSQL로 전환
배포 전: 반드시 PostgreSQL 기준 테스트
```

---

# 7단계. DB 모델 작성

이전 ERD를 Django ORM 모델로 작성합니다.

추천 순서는 다음과 같습니다.

```
1. accounts.User
2. restaurants.Region
3. restaurants.JjambbongRestaurant
4. restaurants.RestaurantMenu
5. restaurants.RestaurantImage
6. reviews.ReviewSource
7. ai_analysis.AIAnalysisResult
8. ai_analysis.SentimentAspectScore
9. ai_analysis.RestaurantKeyword
10. ai_analysis.WordCloudResult
11. restaurants.UserFavorite
12. community.Question
13. community.Answer
```

모델을 다 작성한 뒤:

```bash
uv run python manage.py makemigrations
uv run python manage.py migrate
```

관리자 계정 생성:

```bash
uv run python manage.py createsuperuser
```

---

# 8단계. Django Admin 먼저 붙이기

실무에서 MVP 만들 때 정말 중요한 팁은, **관리자 기능을 처음부터 React로 만들지 않는 것**입니다.

처음에는 Django Admin으로 충분합니다.

Django Admin에서 먼저 가능해야 하는 것:

```
- 지역 등록
- 맛집 등록
- 메뉴 등록
- 이미지 등록
- 리뷰 소스 확인
- AI 분석 결과 확인
- 질문 확인
- 답변 작성
```

이걸 먼저 만들면 프론트가 없어도 데이터를 넣고 테스트할 수 있습니다.

---

# 9단계. 백엔드 API 구축

Django REST Framework로 API를 만듭니다.

추천 구현 순서:

```
1. Region API
2. Restaurant List API
3. Restaurant Detail API
4. Menu API
5. AI Analysis 조회 API
6. WordCloud 조회 API
7. Auth API
8. Favorite API
9. Q&A API
```

처음부터 AI 크롤링까지 붙이지 말고, 먼저 DB에 저장된 AI 결과를 조회하는 API부터 만듭니다.

예를 들어:

```
GET /api/restaurants/1/sentiment/
```

이 API는 처음에는 이미 저장된 `AIAnalysisResult`와 `SentimentAspectScore`만 반환하게 합니다.

AI 분석 생성은 나중에:

```
POST /api/restaurants/1/analyze/
```

로 분리합니다.

---

# 10단계. 프론트엔드 세팅

백엔드 기본 API가 2~3개 정도 나오면 프론트엔드 세팅을 시작합니다.

```bash
cd ..
mkdir frontend
cd frontend

npm create vite@latest . -- --template react-ts
npm install
npm install axios react-router-dom @tanstack/react-query zustand
npm install tailwindcss @tailwindcss/vite
```

추천 화면 순서:

```
1. HomePage
2. RestaurantSearchPage
3. RestaurantDetailPage
4. LoginPage
5. MyPage
6. QnAPage
7. Admin은 일단 Django Admin 사용
```

프론트 구조:

```
frontend/src/
├── pages/
│   ├── HomePage.tsx
│   ├── RestaurantSearchPage.tsx
│   ├── RestaurantDetailPage.tsx
│   ├── LoginPage.tsx
│   ├── MyPage.tsx
│   └── QnAPage.tsx
│
├── components/
│   ├── layout/
│   ├── restaurant/
│   ├── charts/
│   └── common/
│
├── api/
│   ├── client.ts
│   ├── restaurants.ts
│   ├── auth.ts
│   └── qna.ts
│
├── store/
│   └── useAuthStore.ts
│
├── types/
│   ├── restaurant.ts
│   ├── auth.ts
│   └── analysis.ts
│
└── App.tsx
```

---

# 11단계. 프론트-백 연결

처음 연결할 API는 이것만 해도 됩니다.

```
GET /api/regions/
GET /api/restaurants/
GET /api/restaurants/{id}/
GET /api/restaurants/{id}/sentiment/
```

이 4개가 연결되면 사용자는 기본적으로:

```
지역 선택
→ 맛집 검색
→ 맛집 상세 보기
→ AI 분석 결과 보기
```

까지 할 수 있습니다.

이게 MVP의 핵심 흐름입니다.

---

# 12단계. AI 기능은 나중에 붙이기

처음부터 네이버 크롤링, Gemini, LangGraph, Celery를 붙이면 개발 흐름이 너무 무거워집니다.

실무에서는 보통 이렇게 나눕니다.

## 1차

```
AI 분석 결과를 수동 seed data로 넣는다.
프론트에서는 분석 결과를 보여주기만 한다.
```

## 2차

```
관리자 버튼으로 AI 분석을 실행한다.
POST /api/restaurants/{id}/analyze/
```

## 3차

```
Celery 비동기 작업으로 전환한다.
분석 진행 상태를 polling한다.
```

## 4차

```
Redis 캐싱, 랭킹 캐시, 자동 사전 분석을 붙인다.
```

즉, 처음 목표는 “AI가 실제로 분석한다”가 아니라

- *“AI 분석 결과를 서비스 화면에서 잘 보여준다”**입니다.

---

# 13단계. 실무식 전체 개발 흐름

실무에서는 보통 이런 순서로 진행합니다.

```
기획 확정
↓
ERD/API 설계
↓
백엔드 프로젝트 세팅
↓
DB 모델/마이그레이션
↓
Admin 세팅
↓
기본 CRUD API
↓
프론트 프로젝트 세팅
↓
목록/상세 화면 구현
↓
API 연결
↓
인증 연결
↓
핵심 기능 안정화
↓
AI/비동기/캐싱 고도화
↓
배포
↓
로그/피드백/운영 개선
```

---

# 추천 주차별 로드맵

## 1주차: 프로젝트 뼈대 만들기

| 구분 | 작업 |
| --- | --- |
| 기획 | MVP 기능 확정 |
| 문서 | ERD, API 명세 초안 작성 |
| 백엔드 | Django + uv 세팅 |
| DB | 핵심 모델 작성 |
| 관리자 | Django Admin 등록 |
| 결과물 | Admin에서 맛집/메뉴/분석 데이터 등록 가능 |

---

## 2주차: 백엔드 API 구축

| 구분 | 작업 |
| --- | --- |
| API | 지역, 맛집 목록, 상세, 메뉴 API |
| API | AI 분석 조회 API |
| API | 워드클라우드 조회 API |
| 인증 | 회원가입, 로그인, 토큰 갱신 |
| 결과물 | Postman/Swagger에서 핵심 API 테스트 가능 |

---

## 3주차: 프론트엔드 화면 구축

| 구분 | 작업 |
| --- | --- |
| 화면 | 홈 |
| 화면 | 맛집 검색 |
| 화면 | 맛집 상세 |
| 화면 | AI 분석 결과 |
| 화면 | 로그인 |
| 상태 | TanStack Query, Zustand 세팅 |
| 결과물 | mock data 기준 화면 완성 |

---

## 4주차: 프론트-백 연결

| 구분 | 작업 |
| --- | --- |
| 연결 | 검색 API 연결 |
| 연결 | 상세 API 연결 |
| 연결 | AI 분석 API 연결 |
| 연결 | 로그인/내 정보 연결 |
| 기능 | 찜 기능 |
| 결과물 | 실제 DB 데이터가 프론트에 표시됨 |

---

## 5주차: AI 분석 기능 붙이기

| 구분 | 작업 |
| --- | --- |
| 리뷰 | 네이버 블로그 리뷰 수집 |
| AI | Gemini 요약/감성 분석 |
| 분석 | 항목별 점수 저장 |
| 비동기 | Celery 작업 분리 |
| 캐시 | Redis 적용 |
| 결과물 | 관리자 또는 API로 AI 분석 실행 가능 |

---

## 6주차: 운영 기능/배포

| 구분 | 작업 |
| --- | --- |
| 커뮤니티 | Q&A, 맛집 제보 |
| 관리자 | 제보 승인/반려 |
| 랭킹 | 종합/지역/불향/가성비 랭킹 |
| 배포 | Docker, 환경변수, PostgreSQL |
| 개선 | 에러 처리, 로딩, 빈 상태 UI |
| 결과물 | 배포 가능한 MVP |

---

# 가장 추천하는 실제 진행 방식

당장 시작한다면 이렇게 하세요.

```
1. backend 폴더 생성
2. uv + Django 세팅
3. restaurants 앱 생성
4. Region, JjambbongRestaurant, RestaurantMenu 모델 작성
5. migrate
6. Django Admin에서 샘플 맛집 5개 등록
7. restaurants 목록/상세 API 만들기
8. frontend 생성
9. 맛집 목록/상세 화면 만들기
10. API 연결
11. 그 다음 AI 분석 테이블과 화면 추가
```

처음부터 프론트 디자인을 완성하려고 하지 말고,

**DB에 샘플 데이터 넣고 → API로 나오고 → 프론트에 보이는 흐름**을 가장 먼저 만드는 게 좋습니다.

---

# 결론

질문에서 말한 방식처럼:

```
frontend 설계
→ db 구축
→ 백엔드 구축
→ 연결
```

도 가능은 하지만, 실무에서는 보통 이렇게 하는 게 더 안전합니다.

```
기획/MVP 확정
→ ERD/API 계약
→ Django 백엔드 세팅
→ DB 모델/관리자 구축
→ 기본 API 구축
→ 프론트 화면 구축
→ 프론트-백 연결
→ AI/크롤링/캐싱 고도화
→ 배포
```

이 프로젝트는 특히 AI 분석과 크롤링이 무거운 기능이라서, 처음부터 AI까지 붙이지 말고 **맛집 데이터 CRUD + 검색 + 상세 + 분석 결과 조회**를 먼저 완성하는 흐름이 제일 좋습니다.