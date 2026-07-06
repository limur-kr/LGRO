import { useCallback } from "react"
import { useAuthStore } from "./store"

export function useRequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const openModal = useAuthStore((s) => s.openModal)

  return useCallback(
    (onSuccess?: () => void) => {
      if (accessToken) {
        return true
      }
      openModal("login", onSuccess)
      return false
    },
    [accessToken, openModal]
  )
}
