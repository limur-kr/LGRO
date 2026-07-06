import { useMutation } from "@tanstack/react-query"
import { submitQuestion } from "../api/endpoints"

export function useSubmitQuestion() {
  return useMutation({
    mutationFn: (payload: { title: string; content: string; is_public?: boolean }) => submitQuestion(payload),
  })
}
