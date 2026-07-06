export function LoadingState({ label = "불러오는 중..." }: { label?: string }) {
  return <div className="p-6 text-center text-on-surface-variant">{label}</div>
}

export function ErrorState({ label = "불러오지 못했습니다." }: { label?: string }) {
  return <div className="p-6 text-center text-error">{label}</div>
}

export function EmptyState({ label = "표시할 항목이 없습니다." }: { label?: string }) {
  return <div className="p-6 text-center text-on-surface-variant">{label}</div>
}
