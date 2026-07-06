import { useQuery } from "@tanstack/react-query"
import { getRegions, getRestaurantDetail, getRestaurantSentiment, getRestaurantWordcloud, getRestaurants } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"
import type { RestaurantListParams } from "../api/types"

export function useRestaurants(params: RestaurantListParams) {
  return useQuery({
    queryKey: queryKeys.restaurants(params),
    queryFn: () => getRestaurants(params),
    placeholderData: (previous) => previous,
  })
}

export function useRestaurant(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.restaurant(id ?? ""),
    queryFn: () => getRestaurantDetail(id as string),
    enabled: Boolean(id),
  })
}

export function useSentiment(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.sentiment(id ?? ""),
    queryFn: () => getRestaurantSentiment(id as string),
    enabled: Boolean(id),
  })
}

export function useWordcloud(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.wordcloud(id ?? ""),
    queryFn: () => getRestaurantWordcloud(id as string),
    enabled: Boolean(id),
  })
}

export function useRegions() {
  return useQuery({
    queryKey: queryKeys.regions,
    queryFn: getRegions,
    staleTime: 5 * 60 * 1000,
  })
}
