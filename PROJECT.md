# FestMoment 프로젝트 분석 문서

> AI 기반 축제 안내 서비스. 2025 Newroots 해커톤 출품작.  -> AI 기반 전국 짬뽕여지도 안내 서비스
> 팀: 개인 프로젝트로 전환

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [백엔드 아키텍처](#4-백엔드-아키텍처)
5. [프론트엔드 아키텍처](#5-프론트엔드-아키텍처)
6. [데이터베이스](#6-데이터베이스)
7. [API 엔드포인트 목록](#7-api-엔드포인트-목록)
8. [AI 에이전트 시스템](#8-ai-에이전트-시스템)
9. [인증 시스템](#9-인증-시스템)
10. [캐싱 전략](#10-캐싱-전략)
11. [외부 API 연동](#11-외부-api-연동)
12. [환경변수 목록](#12-환경변수-목록)
13. [배포 구성](#13-배포-구성)
14. [핵심 데이터 흐름](#14-핵심-데이터-흐름)

---

## 1. 프로젝트 개요

사용자가 축제를 검색하면 네이버 블로그 리뷰를 AI로 분석해 감성 분석, 워드클라우드, 주변 시설/코스 추천까지 제공하는 서비스.

**주요 기능:**
- 축제 검색 (지역·카테고리·상태 필터)
- AI 감성 분석 (네이버 블로그 기반, LangGraph 멀티에이전트)
- 워드클라우드 생성 (계절/테마별 마스크)
- 주변 시설·코스·축제 추천
- 축제 랭킹 비교
- AI 이미지 렌더링 (Gemini Vision)
- Q&A 게시판
- 사용자 인증 (로컬 + Google OAuth)
- 관리자 대시보드 (피드백, 분석, Q&A 통계)

---

## 2. 기술 스택

### 백엔드

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| 프레임워크 | FastAPI | 0.115.0 | REST API |
| 서버 | Uvicorn + Gunicorn | 0.32.0 / 21.2.0 | ASGI 서버 |
| 언어 | Python | 3.11+ | 백엔드 전반 |
| AI 오케스트레이션 | LangGraph | 1.0.1 | 멀티에이전트 워크플로우 |
| LLM | Google Gemini | Latest | 텍스트·이미지·비전 |
| 비동기 큐 | Celery | 5.3.6 | 백그라운드 태스크 |
| 큐 모니터링 | Flower | 2.0.1 | Celery UI |
| 웹 스크래핑 | Playwright | 1.55.0 | 네이버 블로그 크롤링 |
| 한국어 NLP | KoNLPy (Okt) | 0.6.0 | 형태소 분석 |
| 데이터 처리 | Pandas | 2.3.3 | DataFrame |
| 시각화 | Matplotlib + WordCloud | 3.10.7 / 1.9.4 | 차트·워드클라우드 |
| 이미지 | Pillow | 11.3.0 | 이미지 합성 |
| 지오코딩 | geopy | 2.4.1 | 주소 → 좌표 변환 |
| 인증 | PyJWT + bcrypt | 2.8.0 | JWT + 비밀번호 해싱 |
| DB 어댑터 | psycopg2 | - | PostgreSQL 연결 |
| 설정 | python-dotenv | 1.1.1 | 환경변수 |

### 프론트엔드

| 분류 | 기술 | 버전 | 용도 |
|------|------|------|------|
| UI 라이브러리 | React | 18.3.1 | UI |
| 언어 | TypeScript | 5.2.2 | 타입 안전성 |
| 빌드 도구 | Vite | 7.2.4 | 빌드 |
| 라우팅 | React Router | 6.26.0 | SPA 라우팅 |
| 전역 상태 | Zustand | 4.5.5 | 인증·코스 상태 |
| 서버 상태 | TanStack Query | 5.56.0 | API 캐싱 |
| HTTP 클라이언트 | Axios | 1.7.7 | API 통신 |
| 스타일링 | Tailwind CSS | 3.4.10 | 유틸리티 CSS |
| 애니메이션 | Framer Motion | 11.5.4 | 페이지 전환 |
| 차트 | Recharts | 2.12.7 | 데이터 시각화 |
| 아이콘 | React Icons | 5.3.0 | 아이콘 |
| 날짜 | date-fns | 3.6.0 | 날짜 포맷 |
| 마크다운 | React Markdown | 10.1.0 | MD 렌더링 |

### 인프라

| 분류 | 기술 |
|------|------|
| 컨테이너 | Docker + Docker Compose |
| 리버스 프록시 | Nginx |
| 데이터베이스 | PostgreSQL 15 |
| 캐시 / 메시지 브로커 | Redis 7 |
| 클라우드 (선택) | GCP Cloud Run, Cloud SQL, Memorystore |
| 대안 배포 | Render.com |

---

## 3. 디렉토리 구조

```
FestMoment/
├── api_server.py              # FastAPI 메인 (2,573줄, 모든 엔드포인트)
├── requirements.txt           # Python 의존성
├── .env.example               # 환경변수 템플릿
├── docker-compose.yml         # 7개 서비스 정의
├── Dockerfile                 # API 서버용
├── Dockerfile.celery          # Celery 워커용
├── init_postgres.sql          # PostgreSQL 초기화 (UUID, pg_trgm 확장)
│
├── src/                       # 백엔드 소스 (클린 아키텍처)
│   ├── application/
│   │   ├── agents/            # LangGraph 에이전트 노드
│   │   │   ├── common/       # content_validator, llm_summarizer, rule_scorer
│   │   │   ├── db_search/    # DB 검색·주변 검색 에이전트
│   │   │   ├── naver_review/ # 네이버 블로그 스크래핑
│   │   │   └── course_validation/
│   │   ├── core/             # LangGraph 상태·워크플로우
│   │   ├── supervisors/      # 라우터 에이전트
│   │   ├── use_cases/        # 비즈니스 로직
│   │   │   ├── sentiment_analysis_use_case.py
│   │   │   ├── ranking_use_case.py
│   │   │   ├── rendering_use_case.py
│   │   │   └── analysis_use_case.py
│   │   └── services/         # festival, course, facility, auth, qna
│   │
│   ├── domain/
│   │   └── knowledge_base.py  # 감성 사전 동적 학습 관리
│   │
│   └── infrastructure/
│       ├── config/            # 설정·데이터 로더
│       ├── external_services/ # 네이버 API 클라이언트
│       ├── persistence/       # DB (PostgreSQL/SQLite 폴백)
│       ├── reporting/         # 차트·워드클라우드 생성
│       ├── scraper/           # Playwright 스크래퍼
│       ├── llm_client.py      # Google Gemini 래퍼
│       ├── cache_manager.py   # Redis 캐시
│       └── dynamic_scorer.py  # 동적 감성 점수 계산
│
├── celery/
│   ├── app.py                 # Celery 앱 설정
│   ├── tasks.py               # 비동기 태스크 정의
│   └── precache.py            # 사전 캐싱 스케줄러
│
├── dic/                       # 감성 사전 CSV 파일 (7개, 동적 학습)
├── assets/                    # 워드클라우드 마스크 이미지 (계절 4 + 테마 3)
├── database/                  # 초기 축제 CSV 데이터
├── festivals/                 # 축제 카테고리 JSON (8개)
├── deploy/                    # 배포 설정 (nginx.conf, 가이드, 스크립트)
└── frontend/                  # React 프론트엔드
    ├── src/
    │   ├── pages/             # 13개 페이지 컴포넌트
    │   ├── components/        # auth, charts, feedback, layout, search
    │   ├── store/             # useAuthStore, useCourseStore (Zustand)
    │   ├── lib/               # api.ts, analytics 유틸
    │   ├── types/             # TypeScript 인터페이스
    │   ├── App.tsx            # 라우터 + 보호 라우트
    │   └── main.tsx           # 앱 진입점
    ├── package.json
    ├── vite.config.ts         # 포트 5173, @ 별칭
    └── tailwind.config.js     # cyan(primary) + purple(accent) 팔레트
```

---

## 4. 백엔드 아키텍처

### 클린 아키텍처 (Onion 패턴)

```
[ API Layer ]  api_server.py
      ↓
[ Application Layer ]  use_cases / services / agents / supervisors
      ↓
[ Domain Layer ]  knowledge_base (감성 사전)
      ↓
[ Infrastructure Layer ]  database / llm_client / cache_manager / scraper
```

### 서버 실행

```bash
# 개발
uvicorn api_server:app --reload --port 8000

# 프로덕션 (Docker)
gunicorn api_server:app -k uvicorn.workers.UvicornWorker
```

---

## 5. 프론트엔드 아키텍처

### 페이지 라우팅 (13개 페이지)

| 경로 | 파일 | 보호 여부 |
|------|------|----------|
| `/` | HomePage.tsx | 공개 |
| `/search` | SearchPage.tsx | 공개 |
| `/festival/:name` | FestivalDetailPage.tsx | 공개 |
| `/course/:title` | CourseDetailPage.tsx | 공개 |
| `/facility/:title` | FacilityDetailPage.tsx | 공개 |
| `/my-course` | MyCoursePage.tsx | 공개 |
| `/login` | LoginPage.tsx | 공개 |
| `/register` | RegisterPage.tsx | 공개 |
| `/mypage` | MyPage.tsx | 로그인 필요 |
| `/qna` | QnAPage.tsx | 공개 |
| `/qna/new` | QnANewPage.tsx | 로그인 필요 |
| `/qna/:id` | QnADetailPage.tsx | 공개 |
| `/admin` | AdminDashboard.tsx | 관리자 전용 |

### Zustand 상태

**useAuthStore** (`src/store/useAuthStore.ts`)
- 저장: `user`, `accessToken`, `refreshToken`, `isAuthenticated`, `isAdmin`
- 퍼시스트: `user`, `refreshToken`, `isAuthenticated`, `isAdmin` → localStorage
- 액션: `login()`, `logout()`, `updateUser()`, `setAccessToken()`

**useCourseStore** (`src/store/useCourseStore.ts`)
- 저장: 선택한 코스 아이템
- 퍼시스트: → localStorage

### 컴포넌트 구조

```
components/
├── auth/       # GoogleLoginButton
├── charts/     # SentimentDonutChart, SatisfactionBarChart,
│               # AbsoluteScoreLineChart, OutlierBoxPlot
├── common/     # ProgressIndicator
├── feedback/   # FeedbackWidget, FeatureRating
├── festival/   # FestivalCard
├── layout/     # Layout, Header, Footer
└── search/     # SearchFilters
```

---

## 6. 데이터베이스

### PostgreSQL 테이블

| 테이블 | 용도 |
|--------|------|
| `festivals` | 축제 데이터 (TourAPI 기반) |
| `users` | 사용자 계정 (로컬 + OAuth) |
| `refresh_tokens` | JWT 리프레시 토큰 |
| `feedback` | 사용자 피드백 |
| `feature_ratings` | 기능 만족도 평점 (1-5) |
| `user_events` | 사용자 행동 추적 |
| `questions` | Q&A 질문 |
| `answers` | Q&A 답변 |

- PostgreSQL 익스텐션: `uuid-ossp`, `pg_trgm` (한국어 전문 검색)
- 로컬 개발 폴백: SQLite (`tour.db`)
- 연결 방식: psycopg2 커넥션 풀 + `RealDictCursor`

---

## 7. API 엔드포인트 목록

### 설정 / 검색

```
GET  /api/config/areas              # 전체 시도 목록
GET  /api/config/categories         # 축제 카테고리 (3단계 계층)
POST /api/festivals/search          # 축제 검색 (지역·카테고리·상태·페이지네이션)
GET  /api/festivals/{name}          # 축제 상세
GET  /api/festivals/{name}/trend    # 검색 트렌드 그래프
```

### AI 분석

```
GET  /api/festivals/{name}/sentiment       # 감성 분석
GET  /api/festivals/{name}/wordcloud       # 워드클라우드 생성
GET  /api/festivals/{name}/review-summary  # 네이버 리뷰 요약
GET  /api/festivals/{name}/precautions     # AI 안전 주의사항
POST /api/festivals/ranking                # 복수 축제 랭킹 비교
POST /api/festivals/{name}/render          # AI 이미지 렌더링
```

### 코스 / 주변 검색

```
POST /api/course/validate          # 여행 코스 검증·최적화
POST /api/nearby/search            # 주변 시설·코스·축제 검색
GET  /api/courses/{title}          # 코스 상세
GET  /api/facilities/{title}       # 시설 상세
```

### 인증

```
POST /api/auth/register            # 회원가입
POST /api/auth/login               # 로그인
POST /api/auth/refresh             # 액세스 토큰 갱신
POST /api/auth/logout              # 로그아웃
POST /api/auth/logout-all          # 전체 기기 로그아웃
POST /api/auth/google              # Google OAuth
GET  /api/auth/me                  # 현재 사용자 조회
PUT  /api/auth/profile             # 프로필 수정
DELETE /api/auth/account           # 계정 삭제
```

### Q&A

```
GET    /api/qna/questions                         # 질문 목록 (페이지네이션)
GET    /api/qna/questions/{id}                    # 질문 상세
POST   /api/qna/questions                         # 질문 작성 (인증 필요)
PUT    /api/qna/questions/{id}                    # 질문 수정
DELETE /api/qna/questions/{id}                    # 질문 삭제
POST   /api/qna/questions/{id}/answers            # 답변 작성 (관리자)
GET    /api/user/questions                        # 내 질문 목록 (인증 필요)
```

### 피드백 / 분석

```
POST /api/feedback                 # 피드백 제출
POST /api/feature-rating           # 기능 평점 제출
POST /api/analytics/event          # 사용자 행동 이벤트 기록
```

### 관리자

```
GET  /api/admin/feedback           # 전체 피드백 조회
GET  /api/admin/analytics          # 분석 통계
GET  /api/admin/qna                # Q&A 통계
POST /api/admin/trigger-precache   # 사전 캐싱 트리거 (API 키 필요)
GET  /api/admin/precache-status/{task_id}
```

### 비동기 태스크 (Redis 있을 때)

```
POST /api/async/sentiment/start         # 비동기 감성 분석 시작
POST /api/async/ranking/start           # 비동기 랭킹 시작
GET  /api/async/task/{task_id}/progress # 진행 상황 조회
GET  /api/async/task/{task_id}/result   # 결과 조회
```

---

## 8. AI 에이전트 시스템

### LangGraph 멀티에이전트 구조

```
사용자 요청
    ↓
Supervisor (라우터)
    ├── DB Search Agent       → PostgreSQL 조회
    ├── Nearby Search Agent   → 주변 검색
    ├── Naver Review Agent    → 블로그 스크래핑 (Playwright)
    └── Course Validation Agent
           ↓
      Common Agents
       ├── content_validator   → 콘텐츠 품질 검증
       ├── llm_summarizer      → Gemini 요약
       └── rule_scorer         → 규칙 기반 점수 산출
```

### 감성 분석 파이프라인

```
블로그 텍스트
    → Content Validator (품질 필터)
    → LLM Summarizer (Gemini 요약)
    → Rule Scorer (규칙 기반 점수)
    → Dynamic Scorer (동적 학습 점수)
    → KnowledgeBase 업데이트 (새 감성어 학습)
    → 최종 점수 + 측면별 감성 쌍 반환
```

### 감성 사전 (`dic/`)

- 7개 CSV 파일로 구성된 동적 감성 사전
- 신규 감성어 자동 학습 및 누적
- KoNLPy Okt 형태소 분석기 기반

---

## 9. 인증 시스템

- **JWT**: 액세스 토큰 (15분) + 리프레시 토큰 (장기)
- **역할**: `user` / `admin`
- **OAuth**: Google OAuth 2.0
- **비밀번호**: bcrypt 해싱
- **멀티 디바이스**: `refresh_tokens` 테이블로 기기별 토큰 관리
- **전체 로그아웃**: 해당 사용자의 모든 리프레시 토큰 삭제

---

## 10. 캐싱 전략

| 레이어 | 기술 | 범위 |
|--------|------|------|
| 서버 캐시 | Redis | 감성 분석, 워드클라우드, 랭킹 결과 |
| 사전 캐시 | Celery Beat | 인기 축제 데이터 자동 예열 |
| 클라이언트 상태 | Zustand + localStorage | 인증 토큰, 코스 선택 |
| 서버 상태 | TanStack Query | API 응답 캐싱 |

---

## 11. 외부 API 연동

| 서비스 | 사용 API | 용도 |
|--------|----------|------|
| Google Gemini | Pro, Vision, 2.5 Flash | 텍스트 분석, 이미지 생성·분석 |
| Google Static Maps | Maps API | 위성 지도 (렌더링 참조) |
| Google OAuth | OAuth 2.0 | 소셜 로그인 |
| Naver Search | Search API | 블로그 검색 |
| Naver DataLab | DataLab API | 검색 트렌드 |
| OpenStreetMap | Nominatim | 주소 → 좌표 변환 |

---

## 12. 환경변수 목록

### 백엔드 (`.env`)

```env
# Google
GOOGLE_API_KEY=                    # Gemini API 키
GOOGLE_MAPS_API_KEY=               # Static Maps API 키
GOOGLE_CLIENT_ID=                  # OAuth 클라이언트 ID
GOOGLE_CLIENT_SECRET=              # OAuth 클라이언트 시크릿

# Naver
NAVER_CLIENT_ID=                   # 네이버 API ID
NAVER_CLIENT_SECRET=               # 네이버 API 시크릿

# 데이터베이스
DATABASE_URL=postgresql://user:pass@localhost:5432/festmoment

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=                    # JWT 서명 키

# 서비스
FRONTEND_URL=http://localhost:5173  # OAuth 리디렉션
PRECACHE_API_KEY=                  # 사전 캐싱 트리거 키
```

### 프론트엔드 (`.env`)

```env
VITE_API_URL=http://localhost:8000  # 백엔드 URL
VITE_GOOGLE_CLIENT_ID=             # Google OAuth 클라이언트 ID
```

---

## 13. 배포 구성

### Docker Compose 서비스 (7개)

| 서비스 | 포트 | 역할 |
|--------|------|------|
| nginx | 80 | 리버스 프록시 (docs·flower 인증 보호) |
| api-server | 8000 | FastAPI 백엔드 |
| postgres | 5432 | PostgreSQL 데이터베이스 |
| redis | 6379 | 캐시 + 메시지 브로커 |
| celery-worker | - | 비동기 태스크 처리 |
| celery-flower | 5555 | Celery 모니터링 대시보드 |
| celery-beat | - | 자동 사전 캐싱 스케줄러 |

### nginx 라우팅

```
/api/        → FastAPI :8000 (인증 없음)
/docs        → FastAPI :8000 (HTTP Basic Auth)
/redoc       → FastAPI :8000 (HTTP Basic Auth)
/flower/     → Flower :5555 (HTTP Basic Auth)
```

### 배포 옵션

1. **Docker Compose (로컬/GCP VM)**: `docker-compose up -d`
2. **GCP Cloud Run**: Dockerfile + cloudbuild.yaml, Cloud SQL + Memorystore
3. **Render.com**: Web Service (FastAPI) + Background Worker (Celery)

---

## 14. 핵심 데이터 흐름

### 축제 검색

```
사용자 → SearchPage → POST /api/festivals/search
    → PostgreSQL 쿼리 (지역·카테고리·상태 필터)
    → 페이지네이션 결과 반환 → FestivalCard 렌더링
```

### 감성 분석 요청

```
사용자 → FestivalDetailPage → GET /api/festivals/{name}/sentiment
    → Redis 캐시 확인
    ↓ 캐시 미스
    → Supervisor 에이전트 호출
    → Naver 블로그 검색 + Playwright 스크래핑
    → Content Validator → LLM Summarizer (Gemini)
    → Rule Scorer + Dynamic Scorer
    → KnowledgeBase 업데이트
    → 결과 Redis 캐시 저장
    → 응답 반환 → Recharts 차트 렌더링
```

### 비동기 처리 (Redis 있을 때)

```
사용자 → POST /api/async/sentiment/start → task_id 반환
    → 프론트엔드 폴링: GET /api/async/task/{id}/progress
    → Celery 워커에서 실제 처리
    → 완료 시 GET /api/async/task/{id}/result → 결과 반환
```

---

*최종 업데이트: 2026-06-13*
