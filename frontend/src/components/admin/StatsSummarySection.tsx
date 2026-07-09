import { useAdminStats } from "../../hooks/useAdminStats"

const CATEGORY_LABELS: Record<string, string> = {
  BUG: "버그 신고",
  SUGGESTION: "제안",
  PRAISE: "칭찬",
  OTHER: "기타",
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-surface hard-shadow-sm p-4">
      <p className="mb-1 font-mono text-label-caps text-on-surface-variant">{label}</p>
      <p className="text-headline-lg font-headline">{value}</p>
    </div>
  )
}

export function StatsSummarySection() {
  const { summary, questionStats, feedbackStats, isLoading, isError } = useAdminStats()

  if (isLoading) {
    return (
      <div className="card-surface hard-shadow-sm mb-8 p-5">
        <p className="text-body-sm text-on-surface-variant">통계를 불러오는 중...</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="card-surface hard-shadow-sm mb-8 p-5">
        <p className="text-body-sm text-error">통계를 불러오지 못했습니다.</p>
      </div>
    )
  }

  const openInquiries = (questionStats?.open ?? 0) - (questionStats?.reported_pending ?? 0)

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        <StatCard label="오늘 방문" value={summary?.visits.today ?? 0} />
        <StatCard label="오늘 검색" value={summary?.searches.today ?? 0} />
        <StatCard label="전체 방문" value={summary?.visits.total ?? 0} />
        <StatCard label="전체 검색" value={summary?.searches.total ?? 0} />
        <StatCard label="대기 중 제보" value={questionStats?.reported_pending ?? 0} />
        <StatCard label="답변 대기 문의" value={Math.max(0, openInquiries)} />
        <StatCard label="대기 중 피드백" value={feedbackStats?.unresolved ?? 0} />
        <StatCard label="전체 피드백" value={feedbackStats?.total ?? 0} />
      </div>

      {feedbackStats && Object.keys(feedbackStats.by_category).length > 0 && (
        <div className="card-surface hard-shadow-sm mt-3 p-4">
          <p className="mb-2 font-mono text-label-caps text-on-surface-variant">피드백 종류별 건수</p>
          <div className="flex flex-wrap gap-3 text-body-sm">
            {Object.entries(feedbackStats.by_category).map(([category, count]) => (
              <span key={category}>
                {CATEGORY_LABELS[category] ?? category}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary && summary.searches.popular_keywords.length > 0 && (
        <div className="card-surface hard-shadow-sm mt-3 p-4">
          <p className="mb-2 font-mono text-label-caps text-on-surface-variant">인기 검색어 Top 5</p>
          <div className="flex flex-wrap gap-3 text-body-sm">
            {summary.searches.popular_keywords.slice(0, 5).map((item) => (
              <span key={item.id}>
                {item.keyword} ({item.search_count})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
