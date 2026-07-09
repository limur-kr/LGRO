import type { RestaurantListParams } from "../api/types"

export const queryKeys = {
  me: ["me"] as const,
  regions: ["regions"] as const,
  restaurants: (params: RestaurantListParams) => ["restaurants", params] as const,
  restaurant: (id: string) => ["restaurant", id] as const,
  sentiment: (id: string) => ["restaurant", id, "sentiment"] as const,
  wordcloud: (id: string) => ["restaurant", id, "wordcloud"] as const,
  myQuestions: ["questions", "mine"] as const,
  reportQueue: ["questions", "reports"] as const,
  pendingRestaurantImages: ["restaurant-images", "pending"] as const,
  feedbackQueue: ["feedback", "queue"] as const,
  adminStats: ["admin", "stats"] as const,
}
