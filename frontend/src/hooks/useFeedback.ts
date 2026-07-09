import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getFeedbackQueue, resolveFeedback } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"

export function useFeedbackQueue() {
  return useQuery({
    queryKey: queryKeys.feedbackQueue,
    queryFn: () => getFeedbackQueue({ is_resolved: false }),
  })
}

export function useResolveFeedback() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => resolveFeedback(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.feedbackQueue })
      queryClient.invalidateQueries({ queryKey: queryKeys.adminStats })
    },
  })
}
