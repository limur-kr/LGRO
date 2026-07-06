import { useEffect, useState, type FormEvent } from "react"
import { useAuthStore } from "./store"
import { login, register, getMe } from "../api/endpoints"

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
