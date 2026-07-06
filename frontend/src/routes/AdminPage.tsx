import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../auth/store"
import { getMe, collectReviews, runAnalysis } from "../api/endpoints"
import { useRestaurants } from "../hooks/useRestaurants"
import { useJobPolling } from "../hooks/useJobPolling"
import { LoadingState } from "../components/LoadingState"

export function AdminPage() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const openModal = useAuthStore((s) => s.openModal)

  const adminCheck = useQuery({
    queryKey: ["admin", "me"],
    queryFn: getMe,
    enabled: Boolean(accessToken),
    retry: false,
  })

  const [scope, setScope] = useState<"all" | "single">("all")
  const [restaurantId, setRestaurantId] = useState("")
  const { data: restaurantOptions } = useRestaurants({ ordering: "score" })

  if (!accessToken) {
    return (
      <GatePanel
        message="관리자 로그인이 필요합니다."
        onLoginClick={() => openModal("login", () => adminCheck.refetch())}
      />
    )
  }

  if (adminCheck.isLoading) {
    return <LoadingState label="권한 확인 중..." />
  }

  if (adminCheck.isError) {
    return (
      <GatePanel
        message="인증 오류가 발생했습니다."
        onLoginClick={() => openModal("login", () => adminCheck.refetch())}
      />
    )
  }

  if (!adminCheck.data?.is_service_admin) {
    return <GatePanel message={`'${adminCheck.data?.username}' 계정은 관리자 권한이 없습니다.`} />
  }

  const scopedRestaurantId = scope === "single" ? restaurantId || undefined : undefined

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-8 text-headline-lg font-headline">관리자 대시보드</h1>

      <div className="card-surface hard-shadow-sm mb-8 p-5">
        <p className="mb-3 font-mono text-label-caps text-on-surface-variant">작업 범위</p>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-body-sm">
            <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} />
            전체 맛집
          </label>
          <label className="flex items-center gap-2 text-body-sm">
            <input type="radio" name="scope" checked={scope === "single"} onChange={() => setScope("single")} />
            특정 맛집
          </label>
          {scope === "single" && (
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              className="border-2 border-on-background bg-surface px-3 py-2 text-body-sm"
            >
              <option value="">선택하세요</option>
              {restaurantOptions?.results.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name} ({restaurant.region?.name ?? "지역 미상"})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <AdminActionCard
          title="리뷰 수집"
          description="네이버 블로그 리뷰를 수집합니다."
          buttonLabel="수집 실행"
          trigger={() => collectReviews(scopedRestaurantId)}
        />
        <AdminActionCard
          title="AI 감성 분석"
          description="수집된 리뷰로 11개 항목 감성 분석을 실행합니다."
          buttonLabel="분석 실행"
          trigger={() => runAnalysis(scopedRestaurantId)}
        />
      </div>
    </div>
  )
}

function GatePanel({ message, onLoginClick }: { message: string; onLoginClick?: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center md:px-8">
      <h1 className="mb-4 text-headline-lg font-headline">관리자 대시보드</h1>
      <p className="mb-6 text-body-sm text-on-surface-variant">{message}</p>
      {onLoginClick && (
        <button type="button" onClick={onLoginClick} className="hard-shadow bg-primary px-6 py-3 text-title-md text-on-primary">
          로그인
        </button>
      )}
    </div>
  )
}

function badgeClass(status: string): string {
  const base = "px-3 py-1 text-label-caps font-mono border-2 border-on-background"
  if (status === "done") return `${base} bg-primary/10 text-primary`
  if (status === "error") return `${base} bg-error/10 text-error`
  if (status === "running") return `${base} bg-tertiary/10 text-tertiary`
  return `${base} bg-surface-variant text-on-surface-variant`
}

function AdminActionCard({
  title,
  description,
  buttonLabel,
  trigger,
}: {
  title: string
  description: string
  buttonLabel: string
  trigger: () => Promise<{ job_id: string }>
}) {
  const [jobId, setJobId] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const job = useJobPolling(jobId, () => setIsRunning(false))

  async function handleClick() {
    setIsRunning(true)
    setErrorMessage("")
    setJobId(null)
    try {
      const { job_id } = await trigger()
      setJobId(job_id)
    } catch {
      setErrorMessage("작업 시작에 실패했습니다.")
      setIsRunning(false)
    }
  }

  return (
    <div className="card-surface hard-shadow-sm p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-title-md font-headline">{title}</h2>
        {job && <span className={badgeClass(job.status)}>{job.status}</span>}
      </div>
      <p className="mb-4 text-body-sm text-on-surface-variant">{description}</p>
      <button
        type="button"
        onClick={handleClick}
        disabled={isRunning}
        className="hard-shadow-sm mb-4 w-full bg-primary px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
      >
        {isRunning ? "실행 중..." : buttonLabel}
      </button>
      {errorMessage && <p className="mb-2 text-body-sm text-error">{errorMessage}</p>}
      {(job || jobId) && (
        <pre className="max-h-40 overflow-y-auto border-2 border-on-background bg-surface-container-low p-3 text-body-sm whitespace-pre-wrap">
          {job?.log || "작업을 시작합니다..."}
        </pre>
      )}
    </div>
  )
}
