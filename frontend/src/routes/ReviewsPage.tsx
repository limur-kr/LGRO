import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { useRestaurant, useSentiment } from "../hooks/useRestaurants"
import { useFavoriteMutation } from "../hooks/useFavoriteMutation"
import { useKakaoAuth } from "../hooks/useKakaoAuth"
import { useRequireAuth } from "../auth/useRequireAuth"
import { LoadingState, ErrorState } from "../components/LoadingState"
import { SpiceDots } from "../components/SpiceDots"
import { formatPrice, formatScore } from "../lib/format"
import { regionName, resolveImageUrl, soupStyleLabel } from "../lib/restaurant"
import { PhotoSection } from "../components/restaurant/PhotoSection"

export function ReviewsPage() {
  const { id } = useParams<{ id: string }>()
  const { data: restaurant, isLoading, isError } = useRestaurant(id)
  const { data: sentiment } = useSentiment(id)
  const favoriteMutation = useFavoriteMutation(id ?? "")
  const requireAuth = useRequireAuth()
  const { isLoaded: isKakaoLoaded } = useKakaoAuth()
  const [shareCopied, setShareCopied] = useState(false)
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false)
  const shareMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isShareMenuOpen) return
    function handleClickOutside(event: MouseEvent) {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setIsShareMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isShareMenuOpen])

  if (isLoading) return <LoadingState />
  if (isError || !restaurant) return <ErrorState label="식당 정보를 불러오지 못했습니다." />

  function handleFavoriteClick() {
    if (!requireAuth()) return
    favoriteMutation.mutate(!restaurant!.is_favorite)
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setShareCopied(true)
      setIsShareMenuOpen(false)
      setTimeout(() => setShareCopied(false), 1200)
    })
  }

  function handleKakaoShare() {
    if (!window.Kakao?.isInitialized()) return
    const link = { mobileWebUrl: window.location.href, webUrl: window.location.href }
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: restaurant.name,
        description: `${regionName(restaurant)} · ${soupStyleLabel(restaurant.soup_style)}`,
        imageUrl: resolveImageUrl(restaurant.primary_image_url),
        link,
      },
      buttons: [{ title: "맛집 보기", link }],
    })
    setIsShareMenuOpen(false)
  }

  const images = restaurant.images.length > 0 ? restaurant.images : null

  return (
    <div className="mx-auto max-w-container-max px-4 py-12 md:px-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_400px]">
        <div>
          <div className="mb-6 grid grid-cols-2 gap-2 border-2 border-on-background md:grid-cols-3">
            {(images ?? [{ id: 0, image_url: restaurant.primary_image_url, image: null, caption: "", is_primary: true, ordering: 0 }]).map(
              (image) => (
                <img
                  key={image.id}
                  src={resolveImageUrl(image.image_url || image.image)}
                  alt={image.caption || restaurant.name}
                  className="h-40 w-full object-cover"
                />
              )
            )}
          </div>

          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-headline-lg font-headline">{restaurant.name}</h1>
              <p className="mt-1 text-body-sm text-on-surface-variant">
                {regionName(restaurant)} · {restaurant.address}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleFavoriteClick}
                className={`hard-shadow-sm border-2 border-on-background px-4 py-2 text-body-sm font-medium ${
                  restaurant.is_favorite ? "bg-primary text-on-primary" : "bg-surface"
                }`}
              >
                {restaurant.is_favorite ? "찜 완료" : "찜하기"}
              </button>
              {restaurant.latitude !== null && restaurant.longitude !== null && (
                <Link
                  to={`/map?lat=${restaurant.latitude}&lng=${restaurant.longitude}&id=${restaurant.id}`}
                  className="hard-shadow-sm border-2 border-on-background bg-surface px-4 py-2 text-body-sm font-medium"
                >
                  지도
                </Link>
              )}
              <div className="relative" ref={shareMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsShareMenuOpen((v) => !v)}
                  className="hard-shadow-sm border-2 border-on-background bg-surface px-4 py-2 text-body-sm font-medium"
                >
                  {shareCopied ? "COPIED" : "공유"}
                </button>
                {isShareMenuOpen && (
                  <div className="hard-shadow-sm absolute right-0 top-full z-10 mt-2 w-40 border-2 border-on-background bg-surface">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="block w-full px-4 py-2 text-left text-body-sm hover:bg-surface-container"
                    >
                      링크 복사
                    </button>
                    <button
                      type="button"
                      onClick={handleKakaoShare}
                      disabled={!isKakaoLoaded}
                      className="block w-full border-t-2 border-on-background px-4 py-2 text-left text-body-sm hover:bg-surface-container disabled:opacity-60"
                    >
                      카카오톡 공유
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8 flex flex-wrap items-center gap-6 border-2 border-on-background p-4">
            <span className="text-body-sm">{soupStyleLabel(restaurant.soup_style)}</span>
            <SpiceDots level={restaurant.spice_level} />
            <span className="text-body-sm">{formatPrice(restaurant.average_price)}</span>
            {restaurant.opening_hours && <span className="text-body-sm">{restaurant.opening_hours}</span>}
          </div>

          {restaurant.description && <p className="mb-8 text-body-lg">{restaurant.description}</p>}

          {restaurant.menus.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-4 text-title-md font-headline">메뉴</h2>
              <ul className="divide-y-2 divide-on-background border-2 border-on-background">
                {restaurant.menus.map((menu) => (
                  <li key={menu.id} className="flex items-center justify-between px-4 py-3">
                    <span>
                      {menu.name}
                      {menu.is_signature && <span className="ml-2 text-label-caps font-mono text-primary">시그니처</span>}
                    </span>
                    <span className="font-mono">{formatPrice(menu.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <PhotoSection restaurant={restaurant} />
        </div>

        <div>
          <div className="card-surface hard-shadow p-6">
            <h2 className="mb-4 text-title-md font-headline">AI 감성 분석</h2>
            {!sentiment && <p className="text-body-sm text-on-surface-variant">아직 분석된 리뷰가 없습니다.</p>}
            {sentiment && (
              <>
                <p className="mb-2 font-mono text-display-lg text-primary">{formatScore(sentiment.total_score)}</p>
                <p className="mb-6 text-body-sm text-on-surface-variant">{sentiment.summary}</p>
                <div className="space-y-3">
                  {sentiment.aspect_scores.map((aspect) => (
                    <div key={aspect.aspect}>
                      <div className="mb-1 flex justify-between text-body-sm">
                        <span>{aspect.label}</span>
                        <span className="font-mono text-primary">{aspect.score}</span>
                      </div>
                      <div className="h-2 bg-surface-variant">
                        <div className="h-2 bg-primary" style={{ width: `${Math.max(0, Math.min(100, aspect.score))}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {sentiment.keywords.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {sentiment.keywords.map((keyword) => (
                      <span
                        key={keyword.keyword}
                        className={`border-2 px-3 py-1 text-body-sm ${
                          keyword.sentiment === "positive"
                            ? "border-primary text-primary"
                            : keyword.sentiment === "negative"
                              ? "border-error text-error"
                              : "border-outline text-on-surface-variant"
                        }`}
                      >
                        {keyword.keyword}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
