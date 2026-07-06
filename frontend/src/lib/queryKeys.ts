import type { RestaurantListParams } from "../api/types"

export const queryKeys = {
  regions: ["regions"] as const,
  restaurants: (params: RestaurantListParams) => ["restaurants", params] as const,
  restaurant: (id: string) => ["restaurant", id] as const,
  sentiment: (id: string) => ["restaurant", id, "sentiment"] as const,
  wordcloud: (id: string) => ["restaurant", id, "wordcloud"] as const,
  myQuestions: ["questions", "mine"] as const,
}
