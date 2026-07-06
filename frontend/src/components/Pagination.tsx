interface PaginationProps {
  page: number
  count: number
  pageSize?: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, count, pageSize = 20, onPageChange }: PaginationProps) {
  const totalPages = count ? Math.max(1, Math.ceil(count / pageSize)) : 1
  if (totalPages <= 1) return null

  const start = Math.max(1, Math.min(page - 2, totalPages - 4))
  const end = Math.min(totalPages, start + 4)
  const pages: number[] = []
  for (let n = start; n <= end; n += 1) pages.push(n)

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        className="h-10 border-2 border-on-background bg-surface px-4 text-label-caps font-mono hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
      >
        이전
      </button>
      {pages.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          className={`h-10 w-10 border-2 border-on-background text-label-caps font-mono ${
            n === page ? "bg-primary text-on-primary" : "bg-surface text-on-background hover:bg-surface-container"
          }`}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={page === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        className="h-10 border-2 border-on-background bg-surface px-4 text-label-caps font-mono hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
      </button>
    </div>
  )
}
