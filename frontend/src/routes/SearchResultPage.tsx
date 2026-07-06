import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useRegions, useRestaurants } from "../hooks/useRestaurants"
import { RestaurantCard } from "../components/restaurant/RestaurantCard"
import { Pagination } from "../components/Pagination"
import { LoadingState, ErrorState, EmptyState } from "../components/LoadingState"
import type { RestaurantListParams, SoupStyle } from "../api/types"

const SOUP_STYLES: { value: SoupStyle; label: string }[] = [
  { value: "MEAT", label: "고기 육수" },
  { value: "SEAFOOD", label: "해물 육수" },
  { value: "MIXED", label: "혼합 육수" },
]

const PAGE_SIZE = 20

export function SearchResultPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get("page") || "1")
  const appliedQ = searchParams.get("q") || ""
  const appliedRegion = searchParams.get("region_code") || ""
  const appliedSoupStyle = searchParams.get("soup_style") || ""
  const appliedMinSpice = searchParams.get("min_spice") || ""
  const appliedPriceMode = searchParams.get("price_mode") || ""

  // 위젯(대기) 상태 — "검색 결과 반영" 버튼을 눌러야 실제 검색에 반영된다 (의도된 2단계 UX).
  const [draftQ, setDraftQ] = useState(appliedQ)
  const [draftRegion, setDraftRegion] = useState(appliedRegion)
  const [draftSoupStyle, setDraftSoupStyle] = useState(appliedSoupStyle)
  const [draftMinSpice, setDraftMinSpice] = useState(appliedMinSpice ? Number(appliedMinSpice) : 0)
  const [draftPriceMode, setDraftPriceMode] = useState(appliedPriceMode)

  useEffect(() => {
    setDraftQ(appliedQ)
    setDraftRegion(appliedRegion)
    setDraftSoupStyle(appliedSoupStyle)
    setDraftMinSpice(appliedMinSpice ? Number(appliedMinSpice) : 0)
    setDraftPriceMode(appliedPriceMode)
    // URL이 외부에서 바뀔 때(뒤로가기 등)만 위젯을 재동기화한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedQ, appliedRegion, appliedSoupStyle, appliedMinSpice, appliedPriceMode])

  const { data: regions } = useRegions()

  const params: RestaurantListParams = {
    page,
    ordering: "score",
    q: appliedQ || undefined,
    region_code: appliedRegion || undefined,
    soup_style: appliedSoupStyle || undefined,
    min_spice: appliedMinSpice ? Number(appliedMinSpice) : undefined,
    max_price: appliedPriceMode === "value" ? 10000 : undefined,
    min_price: appliedPriceMode === "premium" ? 10000 : undefined,
  }

  const { data, isLoading, isError } = useRestaurants(params)

  function applyFilters() {
    const next: Record<string, string> = { page: "1" }
    if (draftQ) next.q = draftQ
    if (draftRegion) next.region_code = draftRegion
    if (draftSoupStyle) next.soup_style = draftSoupStyle
    if (draftMinSpice) next.min_spice = String(draftMinSpice)
    if (draftPriceMode) next.price_mode = draftPriceMode
    setSearchParams(next)
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(searchParams)
    next.set("page", String(nextPage))
    setSearchParams(next)
  }

  const results = data?.results ?? []

  return (
    <div className="mx-auto grid max-w-container-max grid-cols-1 gap-8 px-4 py-12 md:grid-cols-[280px_1fr] md:px-8">
      <aside className="card-surface hard-shadow-sm h-fit space-y-6 p-5">
        <div>
          <label className="mb-2 block font-mono text-label-caps text-on-surface-variant">지역</label>
          <select
            value={draftRegion}
            onChange={(e) => setDraftRegion(e.target.value)}
            className="w-full border-2 border-on-background bg-surface px-3 py-2"
          >
            <option value="">전체 지역</option>
            {regions?.results.map((region) => (
              <option key={region.code} value={region.code}>
                {region.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 font-mono text-label-caps text-on-surface-variant">국물 스타일</p>
          <div className="flex flex-col gap-2">
            {SOUP_STYLES.map((style) => (
              <label key={style.value} className="flex items-center gap-2 text-body-sm">
                <input
                  type="checkbox"
                  checked={draftSoupStyle === style.value}
                  onChange={() => setDraftSoupStyle(draftSoupStyle === style.value ? "" : style.value)}
                />
                {style.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block font-mono text-label-caps text-on-surface-variant">
            최소 맵기: {draftMinSpice}
          </label>
          <input
            type="range"
            min={0}
            max={5}
            value={draftMinSpice}
            onChange={(e) => setDraftMinSpice(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <p className="mb-2 font-mono text-label-caps text-on-surface-variant">가격대</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraftPriceMode(draftPriceMode === "value" ? "" : "value")}
              className={`flex-1 border-2 border-on-background px-3 py-2 text-body-sm ${
                draftPriceMode === "value" ? "bg-primary text-on-primary" : "bg-surface"
              }`}
            >
              가성비 (1만원 이하)
            </button>
            <button
              type="button"
              onClick={() => setDraftPriceMode(draftPriceMode === "premium" ? "" : "premium")}
              className={`flex-1 border-2 border-on-background px-3 py-2 text-body-sm ${
                draftPriceMode === "premium" ? "bg-primary text-on-primary" : "bg-surface"
              }`}
            >
              프리미엄 (1만원 이상)
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={applyFilters}
          className="hard-shadow-sm w-full bg-primary px-4 py-3 text-title-md text-on-primary"
        >
          검색 결과 반영
        </button>
      </aside>

      <div>
        <p className="mb-6 text-body-sm text-on-surface-variant">
          {appliedQ && <>&ldquo;{appliedQ}&rdquo; 검색 결과 · </>}총 {data?.count ?? 0}곳
        </p>

        {isLoading && <LoadingState />}
        {isError && <ErrorState />}
        {!isLoading && !isError && results.length === 0 && <EmptyState label="조건에 맞는 맛집이 없습니다." />}

        {!isLoading && !isError && results.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}

        <div className="mt-10">
          <Pagination page={page} count={data?.count ?? 0} pageSize={PAGE_SIZE} onPageChange={goToPage} />
        </div>
      </div>
    </div>
  )
}
