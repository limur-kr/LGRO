import { Link } from "react-router-dom"
import { useRestaurants } from "../hooks/useRestaurants"
import { LoadingState, ErrorState, EmptyState } from "../components/LoadingState"
import { ReportFab } from "../components/ReportFab"
import { formatScore } from "../lib/format"
import { getPrimaryImage, regionName, soupStyleLabel } from "../lib/restaurant"
import type { RestaurantListItem } from "../api/types"

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCx8R9lUQDcGa1LTsURhUfq7c6C17SbAvFNpdBofmTRZb-hHwQdHbDA_1U1Fslioj6uTzG9d4cuorFkrrxvH7JyQgxAUdqp8mp_uazpDeLtFj2M2gYDmRKNy7N0pLDicV7I_NNcoZQbywgT3Gm5F1IdP5Gsgm3s0z1tESIuY_815AvV-NALhOlVO0DK2qkMHyt1kWNEmpXitKadfyNI_5uDjsv8wy2Ot8mD2GE70VyGWkciSgp8rotFjtk7jlN1O946E2k_cWpW2Q"

export function MainPage() {
  const { data, isLoading, isError } = useRestaurants({ ordering: "score" })

  const top5 = data?.results.slice(0, 5) ?? []
  const [first, second, ...rest] = top5
  const count = data?.count ?? 0
  const scores = top5.map((r) => Number(r.sentiment_score ?? 0)).filter(Boolean)
  const averageScore = scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : 0

  return (
    <div>
      {/* Hero */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_IMAGE} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,46,38,0.8), rgba(26,46,38,0.4))" }} />
        </div>
        <div className="relative z-10 max-w-4xl px-margin-mobile text-center text-white">
          <h2 className="mb-4 font-script-premium text-3xl italic text-tertiary-fixed md:text-5xl">
            The Art of Analytical Fire
          </h2>
          <h1 className="mb-8 font-serif-premium text-5xl font-extrabold leading-tight md:text-8xl">
            대한민국 최정상의
            <br />
            <span className="text-flame-red">짬뽕을 기록하다</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl font-body text-body-lg opacity-90">
            데이터로 검증된 미각의 정점. 짬뽕여지도는 전국 3,000여 곳의 짬뽕집을 정밀 분석하여 당신에게 완벽한 한 그릇을 제안합니다.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/ranking"
              className="rounded-full bg-flame-red px-10 py-4 text-lg font-bold text-white shadow-2xl transition-all duration-500 hover:bg-white hover:text-flame-red"
            >
              지금 탐험하기
            </Link>
            <Link
              to="/search"
              className="rounded-full border border-white/30 bg-white/10 px-10 py-4 text-lg font-bold text-white backdrop-blur-md transition-all hover:bg-white/20"
            >
              데이터 리포트 보기
            </Link>
          </div>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white">
          <span className="material-symbols-outlined text-4xl">keyboard_double_arrow_down</span>
        </div>
      </section>

      {/* Quick Match */}
      <section className="classic-texture bg-cream-beige px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 text-center">
            <span className="mb-4 block font-mono text-label-caps uppercase tracking-widest text-flame-red">
              Personalized Recommendation
            </span>
            <h2 className="font-serif-premium text-4xl text-deep-obsidian md:text-5xl">당신만을 위한 퀵 매칭 서비스</h2>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <QuickMatchCard
              to="/search?soup_style=MEAT"
              icon="restaurant_menu"
              title="육수 선호도 매칭"
              description="고기 베이스의 묵직함 vs 해산물의 시원함. 당신의 취향에 맞는 최고의 육수를 추천합니다."
              cta="START MATCHING"
            />
            <QuickMatchCard
              to="/search?min_spice=4"
              icon="local_fire_department"
              title="맵기 레벨링"
              description="스코빌 지수 분석을 통한 정교한 맵기 추천. 당신의 혀가 감당할 수 있는 최적의 화력을 찾으세요."
              cta="EXPLORE HEAT"
              dark
            />
            <QuickMatchCard
              to="/map"
              icon="distance"
              title="지역 기반 매칭"
              description="현재 위치에서 가장 가까운 검증된 명가를 제안합니다. 데이터가 보증하는 실패 없는 선택."
              cta="NEARBY LEGENDS"
            />
          </div>
        </div>
      </section>

      {/* Real-time Top 5 */}
      <section className="overflow-hidden bg-white px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-container-max">
          <div className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row">
            <div>
              <span className="mb-4 block font-mono text-label-caps uppercase tracking-widest text-flame-red">
                Real-time Ranking
              </span>
              <h2 className="font-serif-premium text-4xl text-deep-obsidian md:text-5xl">실시간 인기 짬뽕집 TOP 5</h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                type="button"
                aria-label="이전"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-outline/20 transition-all hover:bg-forest-green hover:text-white"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                type="button"
                aria-label="다음"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-outline/20 transition-all hover:bg-forest-green hover:text-white"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>

          {isLoading && <LoadingState />}
          {isError && <ErrorState />}
          {!isLoading && !isError && top5.length === 0 && <EmptyState label="표시할 식당이 없습니다." />}

          {!isLoading && !isError && top5.length > 0 && (
            <div className="grid grid-cols-1 gap-gutter md:grid-cols-12">
              {first && <PrimaryRankCard restaurant={first} />}
              {second && <SecondaryRankCard restaurant={second} />}
              {rest.map((restaurant, index) => (
                <CompactRankCard key={restaurant.id} restaurant={restaurant} rank={index + 3} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AI Data Report */}
      <section className="relative overflow-hidden bg-forest-green py-24">
        <div className="relative z-10 mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
          <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">
            <div>
              <span className="mb-4 block font-mono text-label-caps uppercase tracking-widest text-tertiary-fixed-dim">
                Analytical Precision
              </span>
              <h2 className="mb-8 font-serif-premium text-4xl text-white md:text-5xl">
                AI 데이터 리포트:
                <br />
                짬뽕 트렌드 분석
              </h2>
              <p className="mb-10 leading-relaxed text-cream-beige/70">
                최근 24시간 동안 수집된 15,402개의 리뷰 데이터를 기반으로 도출된 인사이트입니다. 현재 소비자들이
                열광하는 짬뽕의 속성을 확인하세요.
              </p>
              <div className="space-y-6">
                <ReportBar label="BROTH INTENSITY (육수 농도)" percent={88} colorClass="bg-flame-red" glow="rgba(183,19,26,0.5)" />
                <ReportBar label="SEAFOOD FRESHNESS (해산물 선도)" percent={94} colorClass="bg-scorched-gold" glow="rgba(155,107,0,0.5)" />
                <ReportBar label="HEAT SATISFACTION (맵기 만족도)" percent={72} colorClass="bg-white" />
              </div>
              <Link
                to="/ranking"
                className="group mt-12 flex items-center gap-4 border-b border-cream-beige/30 pb-2 font-bold text-cream-beige transition-all hover:border-flame-red hover:text-flame-red"
              >
                리포트 전문 보기{" "}
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-2">arrow_forward</span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
                <div className="mb-2 font-mono text-3xl text-tertiary-fixed">{count.toLocaleString("ko-KR")}곳</div>
                <div className="text-body-sm text-cream-beige/60">등록된 맛집</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-md">
                <div className="mb-2 font-mono text-3xl text-tertiary-fixed">{formatScore(averageScore)}</div>
                <div className="text-body-sm text-cream-beige/60">Avg. Satisfaction</div>
              </div>
              <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md">
                <div className="mb-6 flex items-center justify-between">
                  <span className="font-serif-premium text-xl text-white">지역별 활동량</span>
                  <span className="material-symbols-outlined text-white/50">equalizer</span>
                </div>
                <div className="flex h-32 items-end gap-2">
                  {[40, 60, 90, 30, 75, 55].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t bg-flame-red/40 transition-all hover:bg-flame-red"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map Preview */}
      <section className="classic-texture relative bg-cream-beige px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto grid max-w-container-max grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <span className="mb-4 block font-mono text-label-caps uppercase tracking-widest text-flame-red">
              Interactive Map
            </span>
            <h2 className="mb-8 font-serif-premium text-4xl text-deep-obsidian md:text-5xl">한눈에 보는 짬뽕 전국지도</h2>
            <p className="mb-10 leading-relaxed text-secondary">
              대한민국 전역의 짬뽕 명가를 인터랙티브 지도로 확인하세요. 지역별 고유의 조리법과 특색을 데이터로
              시각화했습니다.
            </p>
            <ul className="mb-10 space-y-4">
              {["실시간 위치 기반 서비스", "짬뽕 순례길 코스 가이드", "사용자 기반 상세 필터링"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-body-lg">
                  <span className="material-symbols-outlined text-flame-red">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/map"
              className="inline-block rounded-full bg-deep-obsidian px-10 py-4 text-lg font-bold text-white shadow-xl transition-all hover:bg-flame-red"
            >
              전체 지도 보기
            </Link>
          </div>
          <div className="relative lg:col-span-7">
            <div className="aspect-square overflow-hidden rounded-3xl border border-outline/10 bg-white p-4 shadow-2xl">
              <div
                className="relative h-full w-full cursor-crosshair overflow-hidden rounded-2xl grayscale transition-all duration-700 hover:grayscale-0"
                style={{ background: "linear-gradient(135deg, #1a2e26 0%, #5b403d 50%, #f5f2eb 100%)" }}
              >
                <MapPin top="25%" left="33%" label="서울: 중화 요리의 격전지" />
                <MapPin top="67%" left="75%" label="군산: 해산물 짬뽕의 성지" />
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 hidden max-w-[240px] rounded-2xl bg-forest-green p-6 text-white shadow-2xl md:block">
              <div className="mb-1 font-serif-premium text-3xl">{count.toLocaleString("ko-KR")}</div>
              <div className="font-mono text-[10px] uppercase tracking-tighter opacity-60">
                Verified Locations Coast to Coast
              </div>
            </div>
          </div>
        </div>
      </section>

      <ReportFab />
    </div>
  )
}

function QuickMatchCard({
  to,
  icon,
  title,
  description,
  cta,
  dark = false,
}: {
  to: string
  icon: string
  title: string
  description: string
  cta: string
  dark?: boolean
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-10 shadow-sm transition-all duration-500 hover:shadow-xl ${
        dark ? "border-transparent bg-forest-green" : "border-outline/5 bg-white"
      }`}
    >
      <div
        className={`absolute -right-8 -top-8 h-24 w-24 rounded-full transition-transform duration-700 group-hover:scale-150 ${
          dark ? "bg-white/5" : "bg-flame-red/5"
        }`}
      />
      <span className={`material-symbols-outlined mb-6 text-5xl ${dark ? "text-cream-beige" : "text-flame-red"}`}>
        {icon}
      </span>
      <h3 className={`mb-4 font-serif-premium text-2xl ${dark ? "text-cream-beige" : ""}`}>{title}</h3>
      <p className={`mb-8 leading-relaxed text-body-sm ${dark ? "text-surface-container-high" : "text-secondary"}`}>
        {description}
      </p>
      <Link
        to={to}
        className={`flex items-center gap-2 font-mono text-label-caps transition-all group-hover:gap-4 ${
          dark ? "text-cream-beige" : "text-flame-red"
        }`}
      >
        {cta} <span className="material-symbols-outlined text-sm">arrow_forward</span>
      </Link>
    </div>
  )
}

function PrimaryRankCard({ restaurant }: { restaurant: RestaurantListItem }) {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="group relative block h-[500px] overflow-hidden rounded-2xl shadow-lg md:col-span-8"
    >
      <img
        src={getPrimaryImage(restaurant)}
        alt={restaurant.name}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute left-6 top-6 rounded-full bg-flame-red px-6 py-2 font-serif-premium text-xl text-white">
        NO. 1
      </div>
      <div className="absolute bottom-10 left-10 text-white">
        <div className="mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-tertiary-fixed">star</span>
          <span className="font-mono text-sm tracking-widest">AI {formatScore(restaurant.sentiment_score)}</span>
        </div>
        <h3 className="mb-2 font-serif-premium text-4xl">{restaurant.name}</h3>
        <p className="text-body-lg opacity-80">
          {regionName(restaurant)} | {soupStyleLabel(restaurant.soup_style)}
        </p>
      </div>
    </Link>
  )
}

function SecondaryRankCard({ restaurant }: { restaurant: RestaurantListItem }) {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="group relative block h-[500px] overflow-hidden rounded-2xl bg-forest-green shadow-lg md:col-span-4"
    >
      <div className="h-1/2 overflow-hidden">
        <img
          src={getPrimaryImage(restaurant)}
          alt={restaurant.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>
      <div className="p-8 text-cream-beige">
        <div className="mb-1 font-serif-premium text-xl">NO. 2</div>
        <h3 className="mb-3 font-serif-premium text-2xl">{restaurant.name}</h3>
        <p className="mb-6 text-body-sm opacity-70">
          {regionName(restaurant)} | {restaurant.address || "주소 미상"}
        </p>
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <span className="font-mono text-xs">SPICINESS: LEVEL {restaurant.spice_level}</span>
          <span className="material-symbols-outlined">trending_up</span>
        </div>
      </div>
    </Link>
  )
}

function CompactRankCard({ restaurant, rank }: { restaurant: RestaurantListItem; rank: number }) {
  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className="group flex items-center gap-6 rounded-2xl border border-outline/10 bg-cream-beige p-6 transition-all hover:bg-white hover:shadow-xl md:col-span-4"
    >
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full">
        <img src={getPrimaryImage(restaurant)} alt={restaurant.name} className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <div className="font-serif-premium text-lg text-flame-red">NO. {rank}</div>
        <h4 className="truncate font-serif-premium text-xl">{restaurant.name}</h4>
        <p className="truncate text-body-sm text-secondary">{regionName(restaurant)}</p>
      </div>
    </Link>
  )
}

function ReportBar({
  label,
  percent,
  colorClass,
  glow,
}: {
  label: string
  percent: number
  colorClass: string
  glow?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono text-xs text-cream-beige">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${colorClass}`}
          style={{ width: `${percent}%`, boxShadow: glow ? `0 0 15px ${glow}` : undefined }}
        />
      </div>
    </div>
  )
}

function MapPin({ top, left, label }: { top: string; left: string; label: string }) {
  return (
    <div className="group absolute" style={{ top, left }}>
      <div className="absolute h-4 w-4 animate-ping rounded-full bg-flame-red" />
      <div className="relative z-10 h-4 w-4 rounded-full bg-flame-red" />
      <div className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-glass-bg px-4 py-2 opacity-0 shadow-lg backdrop-blur-md transition-opacity group-hover:opacity-100">
        <span className="font-serif-premium text-deep-obsidian">{label}</span>
      </div>
    </div>
  )
}
