import { lazy, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { Layout } from "./components/layout/Layout"
import { LoadingState } from "./components/LoadingState"
import { MainPage } from "./routes/MainPage"
import { RankingPage } from "./routes/RankingPage"
import { SearchResultPage } from "./routes/SearchResultPage"
import { ReviewsPage } from "./routes/ReviewsPage"
import { ReportPage } from "./routes/ReportPage"
import { AdminPage } from "./routes/AdminPage"

const MapPage = lazy(() => import("./routes/MapPage").then((m) => ({ default: m.MapPage })))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<MainPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/search" element={<SearchResultPage />} />
        <Route path="/restaurants/:id" element={<ReviewsPage />} />
        <Route
          path="/map"
          element={
            <Suspense fallback={<LoadingState label="지도를 불러오는 중..." />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}
