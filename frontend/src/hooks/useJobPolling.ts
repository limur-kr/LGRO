import { useEffect, useState } from "react"
import { getJob } from "../api/endpoints"
import type { Job } from "../api/types"

export function useJobPolling(jobId: string | null, onComplete: (status: "done" | "error") => void) {
  const [job, setJob] = useState<Job | null>(null)

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      return
    }

    let cancelled = false
    const timer = setInterval(async () => {
      try {
        const data = await getJob(jobId)
        if (cancelled) return
        setJob(data)
        if (data.status === "done" || data.status === "error") {
          clearInterval(timer)
          onComplete(data.status)
        }
      } catch {
        if (cancelled) return
        clearInterval(timer)
        onComplete("error")
      }
    }, 2000)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // jobId가 바뀔 때만 폴링을 새로 시작한다 (onComplete는 매 렌더 재생성되어도 무방).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  return job
}
