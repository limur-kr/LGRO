import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { approveReport, getReportQueue, rejectReport } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"
import type { ApproveReportPayload } from "../api/types"

export function useReportQueue() {
  return useQuery({
    queryKey: queryKeys.reportQueue,
    queryFn: () => getReportQueue(),
  })
}

export function useApproveReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ApproveReportPayload }) => approveReport(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reportQueue })
      queryClient.invalidateQueries({ queryKey: ["restaurants"] })
    },
  })
}

export function useRejectReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectReport(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reportQueue })
    },
  })
}
