import { useMemo } from "react"
import { Link } from "react-router-dom"
import { useRestaurants } from "../hooks/useRestaurants"
import { RestaurantCard } from "../components/restaurant/RestaurantCard"
import { LoadingState, ErrorState } from "../components/LoadingState"
import { formatScore } from "../lib/format"

export function MainPage() {
  const { data, isLoading, isError } = useRestaurants({ ordering: "score" })

  const top5 = data?.results.slice(0, 5) ?? []
  const stats = useMemo(() => {
    const averageScore =
      top5.length > 0 ? top5.reduce((sum, r) => sum + Number(r.sentiment_score ?? 0), 0) / top5.length : 0
    const youtubeCount = top5.filter((r) => r.youtube_featured).length
    return {
      total: data?.count ?? 0,
      averageScore,
      youtubeCount,
    }
  }, [data?.count, top5])

  return (
    <div>
      <section className="flex flex-col items-center gap-6 bg-on-background px-4 py-24 text-center text-white md:px-8">
        <span className="font-mono text-label-caps text-primary">AI VERIFIED JJAMBBONG</span>
        <h1 className="text-display-lg md:text-6xl">
          광고 대신 데이터로
          <br />
          검증한 짬뽕 맛집
        </h1>
        <p className="max-w-xl text-body-lg text-white/70">
          네이버 블로그 리뷰를 AI로 분석해 국물, 불향, 가격, 위생까지 11개 항목으로 점수화했습니다.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link to="/ranking" className="hard-shadow bg-primary px-8 py-3 text-title-md text-on-primary">
            지금 탐험하기
          </Link>
          <Link to="/map" className="hard-shadow border-2 border-white/40 px-8 py-3 text-title-md text-white">
            전체 지도 보기
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 border-y-2 border-on-background bg-surface-container px-4 py-10 text-center md:grid-cols-3 md:px-8">
        <Stat label="등록된 맛집" value={`${stats.total.toLocaleString("ko-KR")}곳`} />
        <Stat label="상위 5곳 평균 점수" value={formatScore(stats.averageScore)} />
        <Stat label="유튜버 소개 맛집" value={`${stats.youtubeCount}곳`} />
      </section>

      <section className="px-4 py-16 md:px-8">
        <div className="mx-auto max-w-container-max">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-headline-lg font-headline">TOP 5 랭킹</h2>
            <Link to="/ranking" className="text-body-sm font-medium text-primary hover:underline">
              전체 랭킹 보기 →
            </Link>
          </div>

          {isLoading && <LoadingState />}
          {isError && <ErrorState />}
          {!isLoading && !isError && top5.length > 0 && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RestaurantCard restaurant={top5[0]} rank={1} variant="featured" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {top5.slice(1).map((restaurant, index) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} rank={index + 2} variant="compact" />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="border-t-2 border-on-background bg-surface-container-low px-4 py-16 text-center md:px-8">
        <h2 className="mb-4 text-headline-lg font-headline">우리 동네 짬뽕집을 알고 계신가요?</h2>
        <p className="mb-8 text-body-lg text-on-surface-variant">제보해주시면 AI 검증 후 지도에 등록됩니다.</p>
        <Link to="/report" className="hard-shadow inline-block bg-primary px-8 py-3 text-title-md text-on-primary">
          REPORT NEW SPOT
        </Link>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-display-lg text-primary">{value}</p>
      <p className="mt-2 text-label-caps font-mono text-on-surface-variant">{label}</p>
    </div>
  )
}
