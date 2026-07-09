import { useState, type FormEvent } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "../auth/store"
import { getMe, collectReviews, runAnalysis } from "../api/endpoints"
import { useRegions, useRestaurants } from "../hooks/useRestaurants"
import { useApproveReport, useRejectReport, useReportQueue } from "../hooks/useReports"
import { useApproveRestaurantImage, useDeleteRestaurantImage, usePendingRestaurantImages } from "../hooks/useRestaurantImages"
import { useFeedbackQueue, useResolveFeedback } from "../hooks/useFeedback"
import { useJobPolling } from "../hooks/useJobPolling"
import { LoadingState } from "../components/LoadingState"
import { AuthGatePanel } from "../components/AuthGatePanel"
import { StatsSummarySection } from "../components/admin/StatsSummarySection"
import { resolveImageUrl, soupStyleLabel } from "../lib/restaurant"
import type { ApproveReportPayload, Feedback, PendingRestaurantImage, Question, SoupStyle } from "../api/types"

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  BUG: "버그 신고",
  SUGGESTION: "제안",
  PRAISE: "칭찬",
  OTHER: "기타",
}

const SOUP_STYLE_OPTIONS: SoupStyle[] = ["MEAT", "SEAFOOD", "MIXED", "UNKNOWN"]

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
      <AuthGatePanel
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
      <AuthGatePanel
        message="인증 오류가 발생했습니다."
        onLoginClick={() => openModal("login", () => adminCheck.refetch())}
      />
    )
  }

  if (!adminCheck.data?.is_service_admin) {
    return <AuthGatePanel message={`'${adminCheck.data?.username}' 계정은 관리자 권한이 없습니다.`} />
  }

  const scopedRestaurantId = scope === "single" ? restaurantId || undefined : undefined

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 md:px-8">
      <h1 className="mb-8 text-headline-lg font-headline">관리자 대시보드</h1>

      <StatsSummarySection />
      <ReportQueueSection />
      <PhotoQueueSection />
      <FeedbackQueueSection />

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

function ReportQueueSection() {
  const { data, isLoading } = useReportQueue()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const reports = data?.results ?? []

  return (
    <div className="card-surface hard-shadow-sm mb-8 p-5">
      <p className="mb-3 font-mono text-label-caps text-on-surface-variant">맛집 제보 승인</p>
      {isLoading && <p className="text-body-sm text-on-surface-variant">불러오는 중...</p>}
      {!isLoading && reports.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">대기 중인 제보가 없습니다.</p>
      )}
      <div className="space-y-3">
        {reports.map((report) => (
          <ReportRow
            key={report.id}
            report={report}
            expanded={expandedId === report.id}
            onToggle={() => setExpandedId((id) => (id === report.id ? null : report.id))}
          />
        ))}
      </div>
    </div>
  )
}

function ReportRow({
  report,
  expanded,
  onToggle,
}: {
  report: Question
  expanded: boolean
  onToggle: () => void
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const rejectReport = useRejectReport()

  function handleReject() {
    rejectReport.mutate(
      { id: report.id, reason },
      {
        onSuccess: () => {
          setRejecting(false)
          setReason("")
        },
      }
    )
  }

  return (
    <div className="border-2 border-on-background p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h3 className="text-title-sm font-headline">{report.title}</h3>
        <span className="text-label-caps font-mono text-on-surface-variant">
          {report.user?.display_name || report.user?.username || "익명"}
        </span>
      </div>
      {(report.restaurant_name || report.restaurant_address) && (
        <p className="mb-1 text-body-sm">
          {report.restaurant_name || "(식당명 미기재)"}
          {report.restaurant_address ? ` · ${report.restaurant_address}` : ""}
        </p>
      )}
      <p className="mb-3 whitespace-pre-wrap text-body-sm text-on-surface-variant">{report.content}</p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="hard-shadow-sm bg-primary px-4 py-2 text-body-sm font-medium text-on-primary"
        >
          {expanded ? "승인 취소" : "승인"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting((v) => !v)}
          className="border-2 border-on-background px-4 py-2 text-body-sm font-medium"
        >
          반려
        </button>
      </div>

      {rejecting && (
        <div className="mt-3 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="반려 사유 (선택)"
            rows={2}
            className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
          />
          <button
            type="button"
            onClick={handleReject}
            disabled={rejectReport.isPending}
            className="hard-shadow-sm bg-error px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
          >
            {rejectReport.isPending ? "반려 중..." : "반려 확정"}
          </button>
        </div>
      )}

      {expanded && <ApproveForm report={report} onDone={onToggle} />}
    </div>
  )
}

function PhotoQueueSection() {
  const { data, isLoading } = usePendingRestaurantImages()
  const images = data?.results ?? []

  return (
    <div className="card-surface hard-shadow-sm mb-8 p-5">
      <p className="mb-3 font-mono text-label-caps text-on-surface-variant">사진 등록 승인</p>
      {isLoading && <p className="text-body-sm text-on-surface-variant">불러오는 중...</p>}
      {!isLoading && images.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">대기 중인 사진이 없습니다.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {images.map((image) => (
          <PhotoQueueRow key={image.id} image={image} />
        ))}
      </div>
    </div>
  )
}

function PhotoQueueRow({ image }: { image: PendingRestaurantImage }) {
  const approveImage = useApproveRestaurantImage()
  const deleteImage = useDeleteRestaurantImage()

  return (
    <div className="border-2 border-on-background p-3">
      <img
        src={resolveImageUrl(image.image)}
        alt={image.caption || image.restaurant_name}
        className="mb-2 h-32 w-full object-cover"
      />
      <p className="text-body-sm font-medium">{image.restaurant_name}</p>
      {image.caption && <p className="text-body-sm text-on-surface-variant">{image.caption}</p>}
      <p className="mb-3 text-label-caps font-mono text-on-surface-variant">
        {image.uploaded_by || "익명"}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => approveImage.mutate(image.id)}
          disabled={approveImage.isPending}
          className="hard-shadow-sm flex-1 bg-primary px-3 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
        >
          승인
        </button>
        <button
          type="button"
          onClick={() => deleteImage.mutate(image.id)}
          disabled={deleteImage.isPending}
          className="flex-1 border-2 border-on-background px-3 py-2 text-body-sm font-medium disabled:opacity-60"
        >
          반려
        </button>
      </div>
    </div>
  )
}

function FeedbackQueueSection() {
  const { data, isLoading } = useFeedbackQueue()
  const items = data?.results ?? []

  return (
    <div className="card-surface hard-shadow-sm mb-8 p-5">
      <p className="mb-3 font-mono text-label-caps text-on-surface-variant">피드백</p>
      {isLoading && <p className="text-body-sm text-on-surface-variant">불러오는 중...</p>}
      {!isLoading && items.length === 0 && (
        <p className="text-body-sm text-on-surface-variant">대기 중인 피드백이 없습니다.</p>
      )}
      <div className="space-y-3">
        {items.map((feedback) => (
          <FeedbackRow key={feedback.id} feedback={feedback} />
        ))}
      </div>
    </div>
  )
}

function FeedbackRow({ feedback }: { feedback: Feedback }) {
  const resolveFeedbackMutation = useResolveFeedback()

  return (
    <div className="border-2 border-on-background p-4">
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-label-caps font-mono text-on-surface-variant">
          {FEEDBACK_CATEGORY_LABELS[feedback.category] ?? feedback.category}
        </span>
        <span className="text-label-caps font-mono text-on-surface-variant">
          {feedback.user?.display_name || feedback.user?.username || "익명"}
        </span>
      </div>
      <p className="mb-1 whitespace-pre-wrap text-body-sm">{feedback.message}</p>
      {feedback.page_path && (
        <p className="mb-3 text-label-caps font-mono text-on-surface-variant">{feedback.page_path}</p>
      )}
      <button
        type="button"
        onClick={() => resolveFeedbackMutation.mutate(feedback.id)}
        disabled={resolveFeedbackMutation.isPending}
        className="hard-shadow-sm bg-primary px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
      >
        {resolveFeedbackMutation.isPending ? "처리 중..." : "해결 처리"}
      </button>
    </div>
  )
}

function ApproveForm({ report, onDone }: { report: Question; onDone: () => void }) {
  const { data: regions } = useRegions()
  const approveReport = useApproveReport()
  const [name, setName] = useState(report.restaurant_name)
  const [address, setAddress] = useState(report.restaurant_address)
  const [regionCode, setRegionCode] = useState("")
  const [soupStyle, setSoupStyle] = useState<SoupStyle>("UNKNOWN")
  const [spiceLevel, setSpiceLevel] = useState(0)
  const [averagePrice, setAveragePrice] = useState("")
  const [description, setDescription] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  const { data: duplicateCheck } = useRestaurants({ q: name || undefined })
  const duplicates = name ? duplicateCheck?.results ?? [] : []

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!regionCode) {
      setErrorMessage("지역을 선택해주세요.")
      return
    }
    setErrorMessage("")

    const payload: ApproveReportPayload = {
      region_code: regionCode,
      name,
      address,
      soup_style: soupStyle,
      spice_level: spiceLevel,
      description,
    }
    if (averagePrice) {
      payload.average_price = Number(averagePrice)
    }

    approveReport.mutate(
      { id: report.id, payload },
      {
        onSuccess: () => onDone(),
        onError: () => setErrorMessage("승인 처리에 실패했습니다."),
      }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t-2 border-on-background pt-4">
      {duplicates.length > 0 && (
        <p className="border-2 border-tertiary bg-tertiary/10 px-3 py-2 text-body-sm text-tertiary">
          이미 등록된 식당일 수 있습니다: {duplicates.map((r) => r.name).join(", ")}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">식당명</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">주소</span>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
        />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">지역</span>
          <select
            value={regionCode}
            onChange={(e) => setRegionCode(e.target.value)}
            className="w-full border-2 border-on-background bg-surface px-3 py-2 text-body-sm"
          >
            <option value="">선택하세요</option>
            {regions?.results.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">육수 스타일</span>
          <select
            value={soupStyle}
            onChange={(e) => setSoupStyle(e.target.value as SoupStyle)}
            className="w-full border-2 border-on-background bg-surface px-3 py-2 text-body-sm"
          >
            {SOUP_STYLE_OPTIONS.map((style) => (
              <option key={style} value={style}>
                {soupStyleLabel(style)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">매운맛(0-5)</span>
          <input
            type="number"
            min={0}
            max={5}
            value={spiceLevel}
            onChange={(e) => setSpiceLevel(Number(e.target.value))}
            className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">평균 가격 (선택)</span>
        <input
          type="number"
          min={0}
          value={averagePrice}
          onChange={(e) => setAveragePrice(e.target.value)}
          className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">설명 (선택)</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
        />
      </label>
      {errorMessage && <p className="text-body-sm text-error">{errorMessage}</p>}
      <button
        type="submit"
        disabled={approveReport.isPending}
        className="hard-shadow-sm w-full bg-primary px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
      >
        {approveReport.isPending ? "등록 중..." : "승인 및 등록"}
      </button>
    </form>
  )
}
