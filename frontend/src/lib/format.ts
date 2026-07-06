export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "가격 미상"
  }
  return `${Number(value).toLocaleString("ko-KR")}원`
}

export function formatScore(value: number | null | undefined, fallback = "0.0"): string {
  if (value === null || value === undefined) {
    return fallback
  }
  return Number(value).toFixed(1)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "-"
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

export function formatRank(index: number, page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize + index + 1
}
