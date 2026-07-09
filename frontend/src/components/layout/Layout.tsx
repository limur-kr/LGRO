import { useEffect, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Header } from "./Header"
import { Sidebar } from "./Sidebar"
import { Footer } from "./Footer"
import { AuthModal } from "../../auth/AuthModal"
import { FeedbackWidget } from "../FeedbackWidget"
import { useAnalyticsTracking } from "../../hooks/useAnalyticsTracking"

export function Layout() {
  useAnalyticsTracking()
  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <AuthModal />
      <FeedbackWidget />
    </div>
  )
}
