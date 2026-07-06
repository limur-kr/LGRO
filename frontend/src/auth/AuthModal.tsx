import { useEffect, useRef, useState, type FormEvent } from "react"
import { useAuthStore } from "./store"
import { login, register, getMe, loginWithGoogle, loginWithKakao } from "../api/endpoints"
import { useGoogleIdentity } from "../hooks/useGoogleIdentity"
import { useKakaoAuth } from "../hooks/useKakaoAuth"
import type { AuthTokens } from "../api/types"

export function AuthModal() {
  const isOpen = useAuthStore((s) => s.isModalOpen)
  const modalTab = useAuthStore((s) => s.modalTab)
  const onAuthSuccess = useAuthStore((s) => s.onAuthSuccess)
  const closeModal = useAuthStore((s) => s.closeModal)
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)

  const [tab, setTab] = useState<"login" | "register">(modalTab)
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const { isLoaded: isGoogleLoaded } = useGoogleIdentity()
  const { isLoaded: isKakaoLoaded, error: kakaoLoadError } = useKakaoAuth()
  const googleTokenClientRef = useRef<GoogleTokenClient | null>(null)

  useEffect(() => {
    if (isOpen) {
      setTab(modalTab)
      setMessage("")
      setIsError(false)
    }
  }, [isOpen, modalTab])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeModal()
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen, closeModal])

  useEffect(() => {
    if (!isGoogleLoaded || !window.google || googleTokenClientRef.current) return
    googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        void handleGoogleTokenResponse(response)
      },
    })
  }, [isGoogleLoaded])

  if (!isOpen) return null

  async function afterAuthSuccess() {
    try {
      const me = await getMe()
      setUser(me)
    } catch {
      // 사용자 정보 조회 실패는 로그인 흐름을 막지 않는다.
    }
    const callback = onAuthSuccess
    closeModal()
    callback?.()
  }

  async function handleSocialLoginSuccess(tokens: AuthTokens, label: string) {
    setTokens(tokens)
    setIsError(false)
    setMessage(`${label} 로그인되었습니다.`)
    await afterAuthSuccess()
  }

  async function handleGoogleTokenResponse(response: GoogleTokenResponse) {
    if (response.error || !response.access_token) {
      setIsError(true)
      setMessage("Google 로그인이 취소되었거나 실패했습니다.")
      return
    }
    setIsError(false)
    setMessage("Google 로그인 중입니다...")
    try {
      const tokens = await loginWithGoogle(response.access_token)
      await handleSocialLoginSuccess(tokens, "Google")
    } catch (error) {
      setIsError(true)
      setMessage(extractErrorMessage(error, "Google 로그인에 실패했습니다."))
    }
  }

  function handleGoogleLoginClick() {
    googleTokenClientRef.current?.requestAccessToken()
  }

  function handleKakaoLogin() {
    if (!window.Kakao) return
    setIsError(false)
    setMessage("카카오 로그인 중입니다...")
    window.Kakao.Auth.login({
      success: (authObj) => {
        loginWithKakao(authObj.access_token)
          .then((tokens) => handleSocialLoginSuccess(tokens, "카카오"))
          .catch((error) => {
            setIsError(true)
            setMessage(extractErrorMessage(error, "카카오 로그인에 실패했습니다."))
          })
      },
      fail: () => {
        setIsError(true)
        setMessage("카카오 로그인이 취소되었거나 실패했습니다.")
      },
    })
  }

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setIsError(false)
    setMessage("로그인 중입니다...")
    const form = new FormData(event.currentTarget)
    try {
      const tokens = await login({
        username: String(form.get("username") ?? ""),
        password: String(form.get("password") ?? ""),
      })
      setTokens(tokens)
      setMessage("로그인되었습니다.")
      await afterAuthSuccess()
    } catch (error) {
      setIsError(true)
      setMessage(extractErrorMessage(error, "로그인에 실패했습니다."))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setIsError(false)
    setMessage("회원가입 중입니다...")
    const form = new FormData(event.currentTarget)
    const username = String(form.get("username") ?? "")
    const password = String(form.get("password") ?? "")
    try {
      await register({
        username,
        email: String(form.get("email") ?? ""),
        password,
        display_name: String(form.get("display_name") ?? ""),
      })
      const tokens = await login({ username, password })
      setTokens(tokens)
      setMessage("가입과 로그인이 완료되었습니다.")
      await afterAuthSuccess()
    } catch (error) {
      setIsError(true)
      setMessage(extractErrorMessage(error, "회원가입에 실패했습니다."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <div className="w-full max-w-md border-4 border-on-background bg-surface hard-shadow">
        <div className="flex items-center justify-between border-b-2 border-on-background p-5">
          <h2 className="font-headline text-headline-lg">계정</h2>
          <button type="button" onClick={closeModal} className="text-on-surface-variant hover:text-primary" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 border-b-2 border-on-background">
          <button
            type="button"
            onClick={() => {
              setTab("login")
              setMessage("")
            }}
            className={`py-3 text-title-md ${tab === "login" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register")
              setMessage("")
            }}
            className={`py-3 text-title-md ${tab === "register" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
          >
            회원가입
          </button>
        </div>
        <div className="p-6">
          {tab === "login" ? (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <Field label="USERNAME" name="username" autoComplete="username" />
              <Field label="PASSWORD" name="password" type="password" autoComplete="current-password" />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary px-4 py-3 text-title-md text-on-primary hard-shadow-sm disabled:opacity-60"
              >
                로그인
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              <Field label="USERNAME" name="username" autoComplete="username" />
              <Field label="EMAIL" name="email" type="email" autoComplete="email" />
              <Field label="DISPLAY NAME" name="display_name" required={false} autoComplete="name" />
              <Field label="PASSWORD" name="password" type="password" minLength={8} autoComplete="new-password" />
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary px-4 py-3 text-title-md text-on-primary hard-shadow-sm disabled:opacity-60"
              >
                회원가입
              </button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-outline-variant" />
            <span className="text-body-sm text-on-surface-variant">또는</span>
            <div className="h-px flex-1 bg-outline-variant" />
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleLoginClick}
              disabled={!isGoogleLoaded}
              className="flex w-full items-center justify-center gap-3 border-2 border-on-background bg-surface px-4 py-3 text-title-md text-on-background disabled:opacity-60"
            >
              <GoogleLogo />
              Google로 계속하기
            </button>
            <button
              type="button"
              onClick={handleKakaoLogin}
              disabled={!isKakaoLoaded}
              className="flex w-full items-center justify-center gap-3 border-2 border-on-background bg-[#FEE500] px-4 py-3 text-title-md text-[#000000]/85 disabled:opacity-60"
            >
              <KakaoLogo />
              카카오로 계속하기
            </button>
            {kakaoLoadError && <p className="text-body-sm text-error">{kakaoLoadError}</p>}
          </div>

          {message && (
            <p className={`mt-4 min-h-5 text-body-sm ${isError ? "text-error" : "text-primary"}`}>{message}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  minLength,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-label-caps text-on-surface-variant">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        className="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:outline-none"
      />
    </label>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.66 9c0-.59.1-1.17.29-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  )
}

function KakaoLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#000000"
        fillOpacity="0.85"
        d="M9 1.5C4.31 1.5.5 4.53.5 8.27c0 2.4 1.58 4.51 3.96 5.71-.17.62-.63 2.28-.72 2.64-.11.44.16.44.34.32.14-.1 2.24-1.52 3.15-2.14.57.08 1.16.13 1.77.13 4.69 0 8.5-3.03 8.5-6.77S13.69 1.5 9 1.5Z"
      />
    </svg>
  )
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>
      const detail = record.detail ?? record.error ?? record.message
      if (typeof detail === "string") return detail
      const firstKey = Object.keys(record)[0]
      if (firstKey && Array.isArray(record[firstKey])) {
        return String((record[firstKey] as unknown[])[0])
      }
    }
  }
  return fallback
}
