import { create } from "zustand"
import type { User } from "../api/types"

const ACCESS_KEY = "jjampong_access_token"
const REFRESH_KEY = "jjampong_refresh_token"

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isModalOpen: boolean
  modalTab: "login" | "register"
  onAuthSuccess: (() => void) | null
  setTokens: (tokens: { access: string; refresh?: string }) => void
  clearTokens: () => void
  setUser: (user: User | null) => void
  openModal: (tab?: "login" | "register", onSuccess?: () => void) => void
  closeModal: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: localStorage.getItem(ACCESS_KEY),
  refreshToken: localStorage.getItem(REFRESH_KEY),
  user: null,
  isModalOpen: false,
  modalTab: "login",
  onAuthSuccess: null,
  setTokens: ({ access, refresh }) => {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh)
    }
    set({ accessToken: access, refreshToken: refresh ?? get().refreshToken })
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    set({ accessToken: null, refreshToken: null, user: null })
  },
  setUser: (user) => set({ user }),
  openModal: (tab = "login", onSuccess) =>
    set({ isModalOpen: true, modalTab: tab, onAuthSuccess: onSuccess ?? null }),
  closeModal: () => set({ isModalOpen: false, onAuthSuccess: null }),
}))

export function isAuthenticated(): boolean {
  return Boolean(useAuthStore.getState().accessToken)
}
