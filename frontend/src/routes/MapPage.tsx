import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { useRestaurants } from "../hooks/useRestaurants"
import { useKakaoMaps } from "../hooks/useKakaoMaps"
import { LoadingState, ErrorState } from "../components/LoadingState"
import { formatScore } from "../lib/format"
import { getPrimaryImage, regionName } from "../lib/restaurant"
import type { RestaurantListItem } from "../api/types"

function hasValidCoordinates(restaurant: RestaurantListItem): boolean {
  return (
    restaurant.latitude !== null &&
    restaurant.longitude !== null &&
    Number.isFinite(Number(restaurant.latitude)) &&
    Number.isFinite(Number(restaurant.longitude))
  )
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 }
const CENTER_EPSILON = 1e-6

export function MapPage() {
  const { isLoaded, error: kakaoError } = useKakaoMaps()
  const [searchParams] = useSearchParams()
  const focusRestaurantId = searchParams.get("id")
  const [center, setCenter] = useState(() => {
    const lat = Number(searchParams.get("lat"))
    const lng = Number(searchParams.get("lng"))
    return Number.isFinite(lat) && Number.isFinite(lng) && lat && lng ? { lat, lng } : DEFAULT_CENTER
  })
  const { data, isLoading, isError } = useRestaurants({ lat: center.lat, lng: center.lng })
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<kakao.maps.Map | null>(null)
  const markersRef = useRef<kakao.maps.Marker[]>([])
  const [selected, setSelected] = useState<RestaurantListItem | null>(null)
  const hasAutoSelectedRef = useRef(false)

  const restaurantsWithCoords = useMemo(() => (data?.results ?? []).filter(hasValidCoordinates), [data?.results])

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapRef.current) return
    const initialCenter = new window.kakao.maps.LatLng(center.lat, center.lng)
    const map = new window.kakao.maps.Map(mapContainerRef.current, { center: initialCenter, level: focusRestaurantId ? 4 : 6 })
    mapRef.current = map

    // 지도 이동/줌이 끝날 때마다 현재 중심 좌표를 기준으로 가장 가까운 식당 목록을 다시 불러온다.
    window.kakao.maps.event.addListener(map, "idle", () => {
      const next = map.getCenter()
      const nextLat = next.getLat()
      const nextLng = next.getLng()
      setCenter((prev) => {
        if (Math.abs(prev.lat - nextLat) < CENTER_EPSILON && Math.abs(prev.lng - nextLng) < CENTER_EPSILON) {
          return prev
        }
        return { lat: nextLat, lng: nextLng }
      })
    })
  }, [isLoaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !isLoaded) return

    markersRef.current.forEach((marker) => marker.setMap(null))
    markersRef.current = []

    restaurantsWithCoords.forEach((restaurant) => {
      const position = new window.kakao.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude))
      const marker = new window.kakao.maps.Marker({ map, position, title: restaurant.name })
      window.kakao.maps.event.addListener(marker, "click", () => setSelected(restaurant))
      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null))
      markersRef.current = []
    }
  }, [isLoaded, restaurantsWithCoords])

  // 상세페이지의 "지도" 버튼으로 들어온 경우, 목록이 로드되면 해당 식당을 한 번만 자동으로 선택해준다.
  useEffect(() => {
    if (hasAutoSelectedRef.current || !focusRestaurantId || restaurantsWithCoords.length === 0) return
    const match = restaurantsWithCoords.find((restaurant) => restaurant.id === focusRestaurantId)
    if (match) {
      setSelected(match)
      hasAutoSelectedRef.current = true
    }
  }, [focusRestaurantId, restaurantsWithCoords])

  function handleListClick(restaurant: RestaurantListItem) {
    setSelected(restaurant)
    if (mapRef.current && hasValidCoordinates(restaurant)) {
      mapRef.current.panTo(new window.kakao.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude)))
    }
  }

  function zoomIn() {
    mapRef.current?.setLevel(Math.max(1, mapRef.current.getLevel() - 1))
  }
  function zoomOut() {
    mapRef.current?.setLevel(mapRef.current.getLevel() + 1)
  }
  function fitBounds() {
    const map = mapRef.current
    if (!map || restaurantsWithCoords.length === 0) return
    const bounds = new window.kakao.maps.LatLngBounds()
    restaurantsWithCoords.forEach((restaurant) =>
      bounds.extend(new window.kakao.maps.LatLng(Number(restaurant.latitude), Number(restaurant.longitude)))
    )
    map.setBounds(bounds)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr]" style={{ height: "calc(100vh - 64px)" }}>
      <aside className="order-2 flex flex-col overflow-y-auto border-r-2 border-on-background bg-surface lg:order-1">
        <div className="border-b-2 border-on-background p-4">
          <p className="text-body-sm text-on-surface-variant">
            지도 중심에서 가까운 식당 {restaurantsWithCoords.length.toLocaleString("ko-KR")}곳
          </p>
        </div>
        {isLoading && <LoadingState />}
        {isError && <ErrorState />}
        {!isLoading && !isError && restaurantsWithCoords.length === 0 && (
          <div className="p-4 text-center text-body-sm text-on-surface-variant">위경도 데이터가 있는 식당이 없습니다.</div>
        )}
        <div className="divide-y-2 divide-on-background">
          {restaurantsWithCoords.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => handleListClick(restaurant)}
              className="flex w-full gap-4 p-4 text-left hover:bg-surface-container-low"
            >
              <img
                src={getPrimaryImage(restaurant)}
                alt={restaurant.name}
                className="h-20 w-20 shrink-0 border border-on-background object-cover"
              />
              <div className="min-w-0">
                <h3 className="truncate text-title-md font-headline">{restaurant.name}</h3>
                <p className="mb-1 font-mono text-label-caps text-primary">AI {formatScore(restaurant.sentiment_score)}</p>
                <p className="truncate text-body-sm text-on-surface-variant">{restaurant.address}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <div className="relative order-1 lg:order-2">
        {kakaoError && (
          <div className="absolute inset-x-0 top-0 z-20 bg-error px-4 py-2 text-center text-body-sm text-on-error">
            {kakaoError}
          </div>
        )}
        <div ref={mapContainerRef} className="isolate h-full w-full bg-surface-container" />

        <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
          <button
            type="button"
            onClick={zoomIn}
            className="hard-shadow-sm h-10 w-10 border-2 border-on-background bg-surface text-title-md"
          >
            +
          </button>
          <button
            type="button"
            onClick={zoomOut}
            className="hard-shadow-sm h-10 w-10 border-2 border-on-background bg-surface text-title-md"
          >
            −
          </button>
          <button
            type="button"
            onClick={fitBounds}
            className="hard-shadow-sm h-10 w-10 border-2 border-on-background bg-surface text-label-caps"
          >
            ⤢
          </button>
        </div>

        {selected && (
          <div className="hard-shadow absolute bottom-4 left-1/2 z-10 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 border-2 border-on-background bg-surface p-4">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute right-2 top-2 text-on-surface-variant"
              aria-label="닫기"
            >
              ✕
            </button>
            <div className="flex gap-3">
              <img
                src={getPrimaryImage(selected)}
                alt={selected.name}
                className="h-16 w-16 shrink-0 border border-on-background object-cover"
              />
              <div className="min-w-0">
                <h3 className="truncate text-title-md font-headline">{selected.name}</h3>
                <p className="font-mono text-label-caps text-primary">AI {formatScore(selected.sentiment_score)}점</p>
                <p className="truncate text-body-sm text-on-surface-variant">
                  {regionName(selected)} · {selected.address}
                </p>
              </div>
            </div>
            <Link to={`/restaurants/${selected.id}`} className="mt-3 block bg-primary py-2 text-center text-body-sm text-on-primary">
              상세보기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
