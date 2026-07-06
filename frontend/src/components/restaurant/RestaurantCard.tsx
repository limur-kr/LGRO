import { Link } from "react-router-dom"
import type { RestaurantListItem } from "../../api/types"
import { formatPrice, formatScore } from "../../lib/format"
import { getPrimaryImage, regionName, soupStyleLabel } from "../../lib/restaurant"
import { SpiceDots } from "../SpiceDots"

interface RestaurantCardProps {
  restaurant: RestaurantListItem
  rank?: number
  variant?: "featured" | "default" | "compact"
}

export function RestaurantCard({ restaurant, rank, variant = "default" }: RestaurantCardProps) {
  const image = getPrimaryImage(restaurant)

  if (variant === "compact") {
    return (
      <Link
        to={`/restaurants/${restaurant.id}`}
        className="card-surface hard-shadow-sm flex items-center gap-3 p-3 transition hover:-translate-y-0.5"
      >
        <img src={image} alt={restaurant.name} className="h-14 w-14 shrink-0 object-cover border border-on-background" />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-semibold">{restaurant.name}</p>
          <p className="truncate text-body-sm text-on-surface-variant">{regionName(restaurant)}</p>
        </div>
        <span className="ml-auto shrink-0 font-mono text-label-caps text-primary">{formatScore(restaurant.sentiment_score)}</span>
      </Link>
    )
  }

  if (variant === "featured") {
    return (
      <Link to={`/restaurants/${restaurant.id}`} className="card-surface hard-shadow grid grid-cols-1 overflow-hidden md:grid-cols-2">
        <img src={image} alt={restaurant.name} className="h-56 w-full object-cover md:h-full" />
        <div className="flex flex-col justify-center gap-3 p-6">
          {rank !== undefined && <span className="font-mono text-label-caps text-primary">RANK {rank}</span>}
          <h3 className="text-headline-lg-mobile font-headline">{restaurant.name}</h3>
          <p className="text-body-sm text-on-surface-variant">{regionName(restaurant)} · {soupStyleLabel(restaurant.soup_style)}</p>
          <div className="flex items-center gap-4">
            <SpiceDots level={restaurant.spice_level} />
            <span className="font-mono text-title-md text-primary">{formatScore(restaurant.sentiment_score)}</span>
          </div>
          <p className="text-body-sm">{formatPrice(restaurant.average_price)}</p>
        </div>
      </Link>
    )
  }

  return (
    <Link to={`/restaurants/${restaurant.id}`} className="card-surface hard-shadow-sm flex flex-col overflow-hidden transition hover:-translate-y-0.5">
      <div className="relative">
        <img src={image} alt={restaurant.name} className="h-40 w-full object-cover" />
        {rank !== undefined && (
          <span className="absolute left-2 top-2 bg-on-background px-2 py-1 font-mono text-label-caps text-surface">
            #{rank}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate text-title-md font-headline">{restaurant.name}</h3>
        <p className="truncate text-body-sm text-on-surface-variant">{regionName(restaurant)} · {soupStyleLabel(restaurant.soup_style)}</p>
        <div className="mt-auto flex items-center justify-between">
          <SpiceDots level={restaurant.spice_level} size="w-2.5 h-2.5" />
          <span className="font-mono text-label-caps text-primary">{formatScore(restaurant.sentiment_score)}</span>
        </div>
        <p className="text-body-sm">{formatPrice(restaurant.average_price)}</p>
      </div>
    </Link>
  )
}
