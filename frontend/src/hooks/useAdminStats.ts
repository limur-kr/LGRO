import { useQuery } from "@tanstack/react-query"
import { getAnalyticsSummary, getFeedbackStats, getQuestionStats } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"

export function useAdminStats() {
  const summaryQuery = useQuery({
    queryKey: [...queryKeys.adminStats, "analytics"],
    queryFn: getAnalyticsSummary,
  })
  const questionStatsQuery = useQuery({
    queryKey: [...queryKeys.adminStats, "questions"],
    queryFn: getQuestionStats,
  })
  const feedbackStatsQuery = useQuery({
    queryKey: [...queryKeys.adminStats, "feedback"],
    queryFn: getFeedbackStats,
  })

  return {
    summary: summaryQuery.data,
    questionStats: questionStatsQuery.data,
    feedbackStats: feedbackStatsQuery.data,
    isLoading: summaryQuery.isLoading || questionStatsQuery.isLoading || feedbackStatsQuery.isLoading,
    isError: summaryQuery.isError || questionStatsQuery.isError || feedbackStatsQuery.isError,
  }
}
