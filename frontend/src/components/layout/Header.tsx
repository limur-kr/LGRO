import type { FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuthStore } from "../../auth/store"
import { logSearch } from "../../api/endpoints"

export function Header() {
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const clearTokens = useAuthStore((s) => s.clearTokens)
  const openModal = useAuthStore((s) => s.openModal)

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const keyword = String(form.get("q") ?? "").trim()
    if (!keyword) return
    logSearch({ keyword, metadata: { path: window.location.pathname } }).catch(() => {})
    navigate(`/search?q=${encodeURIComponent(keyword)}`)
  }

  function handleAuthClick() {
    if (accessToken) {
      clearTokens()
    } else {
      openModal("login")
    }
  }

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-6 bg-on-background px-4 py-3 md:px-8">
      <Link to="/" className="shrink-0 text-2xl font-bold tracking-tight text-primary">
        짬뽕지도
      </Link>
      <nav className="hidden items-center gap-8 md:flex">
        <Link to="/ranking" className="text-body-lg font-medium text-white/80 hover:text-white">
          랭킹
        </Link>
        <Link to="/map" className="text-body-lg font-medium text-white/80 hover:text-white">
          지도
        </Link>
        <Link to="/report" className="text-body-lg font-medium text-white/80 hover:text-white">
          제보하기
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearchSubmit} className="hidden w-64 items-center gap-2 border border-white/10 bg-white/10 px-3 py-1.5 md:flex">
          <input
            name="q"
            type="search"
            placeholder="짬뽕 맛집 검색..."
            className="w-full border-none bg-transparent text-body-sm text-white placeholder:text-white/40 focus:outline-none"
          />
        </form>
        <button
          type="button"
          onClick={handleAuthClick}
          className="border border-white px-4 py-1.5 text-body-sm font-medium text-white hover:bg-white hover:text-on-background"
        >
          {accessToken ? "로그아웃" : "로그인"}
        </button>
      </div>
    </header>
  )
}
