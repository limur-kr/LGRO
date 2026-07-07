import { useRef, useState, type FormEvent } from "react"
import { useRequireAuth } from "../../auth/useRequireAuth"
import { useDeleteRestaurantImage, useUploadRestaurantImage } from "../../hooks/useRestaurantImages"
import { resolveImageUrl } from "../../lib/restaurant"
import type { RestaurantDetail } from "../../api/types"

export function PhotoSection({ restaurant }: { restaurant: RestaurantDetail }) {
  const requireAuth = useRequireAuth()
  const uploadMutation = useUploadRestaurantImage(restaurant.id)
  const deleteMutation = useDeleteRestaurantImage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState("")
  const [message, setMessage] = useState("")
  const [isError, setIsError] = useState(false)

  function handleRegisterClick() {
    const isReady = requireAuth(() => setIsFormOpen(true))
    if (isReady) setIsFormOpen(true)
  }

  function handleCancel() {
    setIsFormOpen(false)
    setFile(null)
    setCaption("")
    setMessage("")
    setIsError(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setIsError(true)
      setMessage("사진 파일을 선택해주세요.")
      return
    }

    const formData = new FormData()
    formData.append("image", file)
    if (caption.trim()) formData.append("caption", caption.trim())

    setIsError(false)
    setMessage("업로드 중입니다...")

    uploadMutation.mutate(formData, {
      onSuccess: () => {
        setMessage("사진이 등록되었습니다. 관리자 승인 후 표시됩니다.")
        setIsFormOpen(false)
        setFile(null)
        setCaption("")
        if (fileInputRef.current) fileInputRef.current.value = ""
      },
      onError: () => {
        setIsError(true)
        setMessage("사진 등록에 실패했습니다.")
      },
    })
  }

  function handleDelete(imageId: number) {
    if (!window.confirm("사진을 삭제하시겠습니까?")) return
    deleteMutation.mutate(imageId)
  }

  return (
    <div className="mb-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-title-md font-headline">사진</h2>
        <button
          type="button"
          onClick={handleRegisterClick}
          className="hard-shadow-sm border-2 border-on-background bg-surface px-4 py-2 text-body-sm font-medium"
        >
          + 사진 등록
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="mb-4 space-y-3 border-2 border-on-background p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-body-sm"
          />
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="사진 설명 (선택)"
            className="w-full border-2 border-on-background bg-surface-container px-3 py-2 text-body-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="hard-shadow-sm bg-primary px-4 py-2 text-body-sm font-medium text-on-primary disabled:opacity-60"
            >
              {uploadMutation.isPending ? "업로드 중..." : "등록"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="border-2 border-on-background px-4 py-2 text-body-sm font-medium"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {message && <p className={`mb-4 text-body-sm ${isError ? "text-error" : "text-primary"}`}>{message}</p>}

      {restaurant.images.length === 0 ? (
        <p className="text-body-sm text-on-surface-variant">아직 등록된 사진이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {restaurant.images.map((image) => (
            <div key={image.id} className="group relative border-2 border-on-background">
              <img
                src={resolveImageUrl(image.image_url || image.image)}
                alt={image.caption || restaurant.name}
                className="h-32 w-full object-cover"
              />
              {image.caption && (
                <p className="truncate bg-on-background/80 px-2 py-1 text-body-sm text-white">{image.caption}</p>
              )}
              {image.is_owner && (
                <button
                  type="button"
                  onClick={() => handleDelete(image.id)}
                  className="absolute right-1 top-1 hidden h-6 w-6 items-center justify-center bg-on-background/80 text-body-sm text-white group-hover:flex"
                  aria-label="사진 삭제"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
