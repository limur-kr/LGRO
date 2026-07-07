import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  approveRestaurantImage,
  deleteRestaurantImage,
  getPendingRestaurantImages,
  uploadRestaurantImage,
} from "../api/endpoints"
import { queryKeys } from "../lib/queryKeys"

export function useUploadRestaurantImage(restaurantId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (formData: FormData) => uploadRestaurantImage(restaurantId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.restaurant(restaurantId) })
    },
  })
}

export function usePendingRestaurantImages() {
  return useQuery({
    queryKey: queryKeys.pendingRestaurantImages,
    queryFn: getPendingRestaurantImages,
  })
}

export function useApproveRestaurantImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: number) => approveRestaurantImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRestaurantImages })
      queryClient.invalidateQueries({ queryKey: ["restaurant"] })
    },
  })
}

export function useDeleteRestaurantImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (imageId: number) => deleteRestaurantImage(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingRestaurantImages })
      queryClient.invalidateQueries({ queryKey: ["restaurant"] })
    },
  })
}
