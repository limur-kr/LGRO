import { useEffect, useState } from "react"

let loadPromise: Promise<void> | null = null

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve()
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => {
        loadPromise = null
        reject(new Error("Google Identity Services를 불러오지 못했습니다."))
      }
      document.head.appendChild(script)
    })
  }

  return loadPromise
}

export function useGoogleIdentity() {
  const [isLoaded, setIsLoaded] = useState(Boolean(window.google?.accounts?.oauth2))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded) return
    let cancelled = false
    loadGoogleIdentity()
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
