import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../auth/store"
import { getMe, deleteAccount } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"
import { AuthGatePanel } from "../components/AuthGatePanel"
import { LoadingState } from "../components/LoadingState"

export function AccountPage() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const openModal = useAuthStore((s) => s.openModal)

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: getMe,
    enabled: Boolean(accessToken),
    retry: false,
  })

  const [confirming, setConfirming] = useState(false)
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  if (!accessToken) {
    return (
      <AuthGatePanel
        title="내 계정"
        message="로그인이 필요합니다."
        onLoginClick={() => openModal("login", () => meQuery.refetch())}
      />
    )
  }

  if (meQuery.isLoading) {
    return <LoadingState label="계정 정보를 불러오는 중..." />
  }

  if (meQuery.isError || !meQuery.data) {
    return <AuthGatePanel title="내 계정" message="계정 정보를 불러오지 못했습니다." />
  }

  const user = meQuery.data

  async function handleDelete(event: FormEvent) {
    event.preventDefault()
    setErrorMessage("")
    setIsDeleting(true)
    try {
      await deleteAccount(user.has_usable_password ? password : undefined)
      clearTokens()
      navigate("/")
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, "계정 삭제에 실패했습니다."))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-8">
      <h1 className="mb-8 text-headline-lg font-headline">내 계정</h1>

      <div className="card-surface hard-shadow-sm mb-8 space-y-2 p-5 text-body-sm">
        <p>
          <span className="font-mono text-label-caps text-on-surface-variant">USERNAME</span> {user.username}
        </p>
        <p>
          <span className="font-mono text-label-caps text-on-surface-variant">EMAIL</span> {user.email}
        </p>
        {user.display_name && (
          <p>
            <span className="font-mono text-label-caps text-on-surface-variant">DISPLAY NAME</span> {user.display_name}
          </p>
        )}
      </div>

      <div className="border-2 border-error p-5">
        <p className="mb-2 text-title-sm font-headline text-error">회원 탈퇴</p>
        <p className="mb-4 text-body-sm text-on-surface-variant">
          탈퇴하면 계정과 즐겨찾기 정보가 삭제되며 되돌릴 수 없습니다.
        </p>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="border-2 border-error px-4 py-2 text-body-sm font-medium text-error"
          >
            회원 탈퇴
          </button>
        ) : (
          <form onSubmit={handleDelete} className="space-y-3">
            {user.has_usable_password && (
              <label className="block">
                <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">
                  비밀번호 확인
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
                />
              </label>
            )}
            {errorMessage && <p className="text-body-sm text-error">{errorMessage}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isDeleting}
                className="hard-shadow-sm bg-error px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
              >
                {isDeleting ? "탈퇴 처리 중..." : "탈퇴 확정"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false)
                  setErrorMessage("")
                  setPassword("")
                }}
                className="border-2 border-on-background px-4 py-2 text-body-sm font-medium"
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>
      const detail = record.detail ?? record.password
      if (typeof detail === "string") return detail
      if (Array.isArray(detail)) return String(detail[0])
    }
  }
  return fallback
}
