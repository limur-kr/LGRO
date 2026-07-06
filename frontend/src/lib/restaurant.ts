import type { RestaurantDetail, RestaurantListItem, SoupStyle } from "../api/types"

const API_ORIGIN = new URL(import.meta.env.VITE_API_BASE_URL).origin

export const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420"><rect width="640" height="420" fill="#f3f3f3"/><circle cx="320" cy="210" r="112" fill="#ffdad6"/><circle cx="320" cy="210" r="78" fill="#db322f"/><path d="M220 130c54 36 147 36 200 0" fill="none" stroke="#1a1c1c" stroke-width="14" stroke-linecap="round"/><text x="320" y="350" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#1a1c1c">JJAMPPONG</text></svg>'
  )

const SOUP_STYLE_LABELS: Record<SoupStyle, string> = {
  MEAT: "고기 육수",
  SEAFOOD: "해물 육수",
  MIXED: "혼합 육수",
  UNKNOWN: "미분류",
}

export function soupStyleLabel(style: SoupStyle | string | null | undefined): string {
  return SOUP_STYLE_LABELS[style as SoupStyle] ?? "미분류"
}

export function resolveImageUrl(path: string | null | undefined): string {
  if (!path) return FALLBACK_IMAGE
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path
  return path.startsWith("/") ? `${API_ORIGIN}${path}` : `${API_ORIGIN}/${path}`
}

export function getPrimaryImage(restaurant: RestaurantListItem | RestaurantDetail | null | undefined): string {
  if (!restaurant) return FALLBACK_IMAGE
  if (restaurant.primary_image_url) {
    return resolveImageUrl(restaurant.primary_image_url)
  }
  const images = "images" in restaurant ? restaurant.images : undefined
  const image = images?.[0]
  return resolveImageUrl(image?.image_url || image?.image)
}

export function regionName(restaurant: RestaurantListItem | RestaurantDetail | null | undefined): string {
  return restaurant?.region?.name ?? "지역 미상"
}
