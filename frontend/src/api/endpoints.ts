import { apiClient } from "./client"
import type {
  AIAnalysisResult,
  ApproveReportPayload,
  AuthTokens,
  Job,
  Paginated,
  Question,
  Region,
  RestaurantDetail,
  RestaurantListItem,
  RestaurantListParams,
  RestaurantMenu,
  User,
  WordCloudResult,
} from "./types"

function isNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    (error as { response?: { status?: number } }).response?.status === 404
  )
}

export function getRegions() {
  return apiClient.get<Paginated<Region>>("/regions/").then((r) => r.data)
}

export function getRestaurants(params?: RestaurantListParams) {
  return apiClient.get<Paginated<RestaurantListItem>>("/restaurants/", { params }).then((r) => r.data)
}

export function getRestaurantDetail(id: string) {
  return apiClient.get<RestaurantDetail>(`/restaurants/${encodeURIComponent(id)}/`).then((r) => r.data)
}

export function getRestaurantMenus(id: string) {
  return apiClient.get<RestaurantMenu[]>(`/restaurants/${encodeURIComponent(id)}/menus/`).then((r) => r.data)
}

export function getRestaurantSentiment(id: string) {
  return apiClient
    .get<AIAnalysisResult>(`/restaurants/${encodeURIComponent(id)}/sentiment/`)
    .then((r) => r.data)
    .catch((error) => {
      if (isNotFound(error)) return null
      throw error
    })
}

export function getRestaurantWordcloud(id: string) {
  return apiClient
    .get<WordCloudResult>(`/restaurants/${encodeURIComponent(id)}/wordcloud/`)
    .then((r) => r.data)
    .catch((error) => {
      if (isNotFound(error)) return null
      throw error
    })
}

export function favoriteRestaurant(id: string) {
  return apiClient.post<{ is_favorite: boolean }>(`/restaurants/${encodeURIComponent(id)}/favorite/`).then((r) => r.data)
}

export function unfavoriteRestaurant(id: string) {
  return apiClient.delete<{ is_favorite: boolean }>(`/restaurants/${encodeURIComponent(id)}/favorite/`).then((r) => r.data)
}

export function login(credentials: { username: string; password: string }) {
  return apiClient.post<AuthTokens>("/auth/login/", credentials).then((r) => r.data)
}

export function register(payload: {
  username: string
  email: string
  password: string
  display_name?: string
}) {
  return apiClient.post<User>("/auth/register/", payload).then((r) => r.data)
}

export function loginWithGoogle(accessToken: string) {
  return apiClient.post<AuthTokens>("/auth/google/", { access_token: accessToken }).then((r) => r.data)
}

export function loginWithKakao(accessToken: string) {
  return apiClient.post<AuthTokens>("/auth/kakao/", { access_token: accessToken }).then((r) => r.data)
}

export function getMe() {
  return apiClient.get<User>("/auth/me/").then((r) => r.data)
}

export function getQuestions(params?: { page?: number }) {
  return apiClient.get<Paginated<Question>>("/questions/", { params }).then((r) => r.data)
}

export function getMyQuestions() {
  return apiClient.get<Paginated<Question>>("/questions/mine/").then((r) => r.data)
}

export function submitQuestion(payload: {
  title: string
  content: string
  is_public?: boolean
  restaurant_name?: string
  restaurant_address?: string
}) {
  return apiClient.post<Question>("/questions/", payload).then((r) => r.data)
}

export function getReportQueue(params?: { page?: number }) {
  return apiClient
    .get<Paginated<Question>>("/questions/", { params: { ...params, status: "OPEN", reported_only: "true" } })
    .then((r) => r.data)
}

export function approveReport(id: string, payload: ApproveReportPayload) {
  return apiClient.post<Question>(`/questions/${encodeURIComponent(id)}/approve/`, payload).then((r) => r.data)
}

export function rejectReport(id: string, reason?: string) {
  return apiClient
    .post<Question>(`/questions/${encodeURIComponent(id)}/reject/`, reason ? { reason } : {})
    .then((r) => r.data)
}

export function logVisit(payload: Record<string, unknown>) {
  return apiClient.post("/analytics/visits/", payload).then((r) => r.data)
}

export function logSearch(payload: Record<string, unknown>) {
  return apiClient.post("/analytics/searches/", payload).then((r) => r.data)
}

export function getPopularSearches() {
  return apiClient.get("/analytics/popular-searches/").then((r) => r.data)
}

export function getAnalyticsSummary() {
  return apiClient.get("/analytics/summary/").then((r) => r.data)
}

export function collectReviews(restaurantId?: string) {
  return apiClient
    .post<{ job_id: string }>("/admin/collect-reviews/", restaurantId ? { restaurant_id: restaurantId } : {})
    .then((r) => r.data)
}

export function runAnalysis(restaurantId?: string) {
  return apiClient
    .post<{ job_id: string }>("/admin/run-analysis/", restaurantId ? { restaurant_id: restaurantId } : {})
    .then((r) => r.data)
}

export function getJob(jobId: string) {
  return apiClient.get<Job>(`/admin/jobs/${encodeURIComponent(jobId)}/`).then((r) => r.data)
}
