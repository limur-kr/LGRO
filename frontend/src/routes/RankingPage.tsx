import { useSearchParams } from "react-router-dom"
import { useRestaurants } from "../hooks/useRestaurants"
import { RestaurantCard } from "../components/restaurant/RestaurantCard"
import { Pagination } from "../components/Pagination"
import { LoadingState, ErrorState, EmptyState } from "../components/LoadingState"
import { formatRank } from "../lib/format"
import type { RestaurantListParams } from "../api/types"

const RANK_TABS: { key: string; label: string; params: RestaurantListParams }[] = [
  { key: "overall", label: "종합", params: { ordering: "score" } },
  { key: "fire", label: "불향", params: { soup_style: "MEAT", youtube_featured: true, ordering: "score" } },
  { key: "spicy", label: "맵부심", params: { min_spice: 4, ordering: "-spice" } },
  { key: "latest", label: "신규", params: { ordering: "latest" } },
]

const PAGE_SIZE = 20

export function RankingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get("rank_tab") || "overall"
  const page = Number(searchParams.get("page") || "1")

  const tab = RANK_TABS.find((t) => t.key === activeTab) ?? RANK_TABS[0]
  const { data, isLoading, isError } = useRestaurants({ ...tab.params, page })

  function selectTab(key: string) {
    setSearchParams({ rank_tab: key, page: "1" })
  }

  function goToPage(nextPage: number) {
    setSearchParams({ rank_tab: activeTab, page: String(nextPage) })
  }

  const results = data?.results ?? []

  return (
    <div className="mx-auto max-w-container-max px-4 py-12 md:px-8">
      <h1 className="mb-8 text-headline-lg font-headline">짬뽕 랭킹</h1>

      <div className="mb-8 flex flex-wrap gap-2 border-b-2 border-on-background">
        {RANK_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTab(t.key)}
            className={`px-5 py-3 text-title-md ${
              t.key === activeTab ? "border-b-4 border-primary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState />}
      {!isLoading && !isError && results.length === 0 && <EmptyState />}

      {!isLoading && !isError && results.length > 0 && (
        <>
          {page === 1 && results[0] && (
            <div className="mb-6">
              <RestaurantCard restaurant={results[0]} rank={1} variant="featured" />
            </div>
          )}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(page === 1 ? results.slice(1) : results).map((restaurant, index) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                rank={formatRank(index + (page === 1 ? 1 : 0), page, PAGE_SIZE)}
              />
            ))}
          </div>
        </>
      )}

      <div className="mt-10">
        <Pagination page={page} count={data?.count ?? 0} pageSize={PAGE_SIZE} onPageChange={goToPage} />
      </div>
    </div>
  )
}
