import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "../auth/store"
import type { AuthTokens } from "./types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    const refreshToken = useAuthStore.getState().refreshToken
    if (!refreshToken) {
      return Promise.reject(new Error("리프레시 토큰이 없습니다."))
    }

    refreshPromise = axios
      .post<AuthTokens>(`${API_BASE_URL}/auth/refresh/`, { refresh: refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setTokens(data)
        return data.access
      })
      .finally(() => {
        refreshPromise = null
      })
  }

  return refreshPromise
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`)
  }
  return config
})

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableConfig | undefined
    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh/")

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !isRefreshCall &&
      !originalRequest._retry &&
      useAuthStore.getState().refreshToken
    ) {
      originalRequest._retry = true
      try {
        const newAccessToken = await refreshAccessToken()
        originalRequest.headers.set("Authorization", `Bearer ${newAccessToken}`)
        return apiClient(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().clearTokens()
        return Promise.reject(refreshError)
      }
    }

    if (error.response?.status === 401 && isRefreshCall) {
      useAuthStore.getState().clearTokens()
    }

    return Promise.reject(error)
  }
)
