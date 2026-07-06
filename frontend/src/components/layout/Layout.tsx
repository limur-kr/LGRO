import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { AuthModal } from "../../auth/AuthModal"
import { useAnalyticsTracking } from "../../hooks/useAnalyticsTracking"

export function Layout() {
  useAnalyticsTracking()

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
    </div>
  )
}
