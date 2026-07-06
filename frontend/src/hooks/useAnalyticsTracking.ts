import { useEffect } from "react"
import { useLocation, useMatch } from "react-router-dom"
import { logVisit } from "../api/endpoints"

export function useAnalyticsTracking() {
  const location = useLocation()
  const detailMatch = useMatch("/restaurants/:id")

  useEffect(() => {
    const payload: Record<string, unknown> = {
      event_type: detailMatch ? "detail_view" : "page_view",
      path: location.pathname,
      full_url: window.location.href,
      referrer: document.referrer,
      metadata: { title: document.title },
    }
    if (detailMatch?.params.id) {
      payload.restaurant = detailMatch.params.id
    }

    // sendBeacon은 credentials 모드가 항상 include라서, 인증에 쿠키가 아닌
    // Authorization 헤더를 쓰는 이 백엔드의 와일드카드 CORS 설정과 충돌해 막힌다.
    // 방문 로그는 유실 허용 가능한 수준이라 일반 요청으로 충분하다.
    logVisit(payload).catch(() => {})
    // location.pathname 변경마다만 재실행 (detailMatch는 pathname에서 파생됨)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
}
