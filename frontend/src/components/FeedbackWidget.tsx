import { useEffect, useState, type FormEvent } from "react"
import { useLocation } from "react-router-dom"
import { submitFeedback } from "../api/endpoints"
import type { FeedbackCategory } from "../api/types"

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string }[] = [
  { value: "BUG", label: "버그 신고" },
  { value: "SUGGESTION", label: "제안" },
  { value: "PRAISE", label: "칭찬" },
  { value: "OTHER", label: "기타" },
]

export function FeedbackWidget() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [category, setCategory] = useState<FeedbackCategory>("SUGGESTION")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [isError, setIsError] = useState(false)
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  function openWidget() {
    setCategory("SUGGESTION")
    setMessage("")
    setStatusMessage("")
    setIsError(false)
    setIsOpen(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    setIsError(false)
    try {
      await submitFeedback({ category, message: message.trim(), page_path: location.pathname })
      setStatusMessage("소중한 의견 감사합니다.")
      setMessage("")
      setTimeout(() => setIsOpen(false), 1200)
    } catch {
      setIsError(true)
      setStatusMessage("제출에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed bottom-8 left-8 z-50">
        <button
          type="button"
          onClick={openWidget}
          className="hard-shadow-sm flex items-center gap-2 rounded-full border-2 border-on-background bg-surface px-4 py-3 text-body-sm font-medium text-on-background transition-transform hover:scale-105"
        >
          <span className="material-symbols-outlined text-xl">chat_bubble</span>
          피드백
        </button>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false)
          }}
        >
          <div className="w-full max-w-md border-4 border-on-background bg-surface hard-shadow">
            <div className="flex items-center justify-between border-b-2 border-on-background p-5">
              <h2 className="font-headline text-headline-lg">피드백 보내기</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-on-surface-variant hover:text-primary"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3 p-5">
              <label className="block">
                <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">종류</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
                  className="w-full border-2 border-on-background bg-surface px-3 py-2 text-body-sm"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-label-caps text-on-surface-variant">내용</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={4}
                  placeholder="불편한 점이나 제안을 자유롭게 남겨주세요."
                  className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
                />
              </label>
              {statusMessage && (
                <p className={`text-body-sm ${isError ? "text-error" : "text-primary"}`}>{statusMessage}</p>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="hard-shadow-sm w-full bg-primary px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
              >
                {submitting ? "제출 중..." : "제출하기"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
