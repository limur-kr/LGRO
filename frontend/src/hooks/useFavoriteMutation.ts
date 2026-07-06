import { useMutation, useQueryClient } from "@tanstack/react-query"
import { favoriteRestaurant, unfavoriteRestaurant } from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"
import type { RestaurantDetail } from "../api/types"

export function useFavoriteMutation(restaurantId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.restaurant(restaurantId)

  return useMutation({
    mutationFn: (nextIsFavorite: boolean) =>
      nextIsFavorite ? favoriteRestaurant(restaurantId) : unfavoriteRestaurant(restaurantId),
    onMutate: async (nextIsFavorite: boolean) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<RestaurantDetail>(key)
      if (previous) {
        queryClient.setQueryData<RestaurantDetail>(key, { ...previous, is_favorite: nextIsFavorite })
      }
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
