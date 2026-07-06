import { useEffect, useState } from "react"

let loadPromise: Promise<void> | null = null

function loadKakaoSdk(): Promise<void> {
  if (window.Kakao?.isInitialized()) {
    return Promise.resolve()
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const jsKey = import.meta.env.VITE_KAKAO_JS_KEY
      if (!jsKey) {
        loadPromise = null
        reject(new Error("VITE_KAKAO_JS_KEY가 설정되어 있지 않습니다."))
        return
      }

      if (window.Kakao) {
        window.Kakao.init(jsKey)
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = "https://developers.kakao.com/sdk/js/kakao.js"
      script.onload = () => {
        window.Kakao.init(jsKey)
        resolve()
      }
      script.onerror = () => {
        loadPromise = null
        reject(new Error("Kakao SDK를 불러오지 못했습니다."))
      }
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

export function useKakaoAuth() {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.Kakao?.isInitialized()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded) return
    let cancelled = false
    loadKakaoSdk()
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
