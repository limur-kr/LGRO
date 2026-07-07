import { useState, type FormEvent } from "react"
import { useRequireAuth } from "../auth/useRequireAuth"
import { useSubmitQuestion } from "../hooks/useSubmitQuestion"
import { useAuthStore } from "../auth/store"

export function ReportPage() {
  const requireAuth = useRequireAuth()
  const openModal = useAuthStore((s) => s.openModal)
  const submitQuestion = useSubmitQuestion()
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget

    if (!requireAuth()) {
      setIsError(true)
      setMessage("로그인 후 제출할 수 있습니다.")
      return
    }

    const formData = new FormData(form)
    const restaurantName = String(formData.get("restaurant_name") ?? "")
    const address = String(formData.get("address") ?? "")
    const content = String(formData.get("content") ?? "")
    const title = String(formData.get("title") ?? "")
    const isPublic = formData.get("is_public") !== null

    setIsError(false)
    setMessage("제보를 제출하는 중입니다...")

    submitQuestion.mutate(
      {
        title,
        content,
        is_public: isPublic,
        restaurant_name: restaurantName,
        restaurant_address: address,
      },
      {
        onSuccess: () => {
          form.reset()
          setMessage("제보가 성공적으로 접수되었습니다.")
        },
        onError: (error: unknown) => {
          const status = (error as { response?: { status?: number } }).response?.status
          if (status === 401) {
            openModal("login")
          }
          setIsError(true)
          setMessage("제보 제출에 실패했습니다.")
        },
      }
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 md:px-8">
      <h1 className="mb-2 text-headline-lg font-headline">맛집 제보하기</h1>
      <p className="mb-8 text-body-sm text-on-surface-variant">
        우리 동네 짬뽕집을 알려주시면 AI 검증 후 지도에 등록됩니다.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="제목" name="title" required />
        <Field label="식당명" name="restaurant_name" />
        <Field label="지역/주소" name="address" />
        <div>
          <label className="mb-2 block font-mono text-label-caps text-on-surface-variant">상세 내용</label>
          <textarea
            name="content"
            rows={6}
            className="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm">
          <input type="checkbox" name="is_public" defaultChecked />
          다른 사용자에게 공개
        </label>
        <button
          type="submit"
          disabled={submitQuestion.isPending}
          className="hard-shadow w-full bg-primary px-4 py-3 text-title-md text-on-primary disabled:opacity-60"
        >
          제보하기
        </button>
        {message && <p className={`text-body-sm ${isError ? "text-error" : "text-primary"}`}>{message}</p>}
      </form>
    </div>
  )
}

function Field({ label, name, required = false }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-label-caps text-on-surface-variant">{label}</span>
      <input
        name={name}
        required={required}
        className="w-full border-2 border-on-background bg-surface-container px-4 py-3 focus:border-primary focus:outline-none"
      />
    </label>
  )
}
