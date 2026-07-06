import { useEffect, useState } from "react"

function getKakaoKey(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get("kakao_key") || localStorage.getItem("kakaoMapAppKey") || import.meta.env.VITE_KAKAO_MAP_KEY || ""
}

let loadPromise: Promise<void> | null = null

function loadKakaoMaps(): Promise<void> {
  if (window.kakao?.maps) {
    return new Promise((resolve) => window.kakao.maps.load(resolve))
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const key = getKakaoKey()
      if (!key) {
        loadPromise = null
        reject(new Error("Kakao Maps JavaScript 키가 필요합니다. ?kakao_key=키 또는 localStorage.kakaoMapAppKey로 설정하세요."))
        return
      }
      const script = document.createElement("script")
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`
      script.onload = () => window.kakao.maps.load(resolve)
      script.onerror = () => {
        loadPromise = null
        reject(new Error("Kakao Maps API를 불러오지 못했습니다."))
      }
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

export function useKakaoMaps() {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.kakao?.maps))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded) return
    let cancelled = false
    loadKakaoMaps()
      .then(() => {
        if (!cancelled) setIsLoaded(true)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [isLoaded])

  return { isLoaded, error }
}
