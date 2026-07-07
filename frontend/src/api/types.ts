export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface Region {
  code: string
  name: string
  parent: string | null
  ordering: number
  is_active: boolean
}

export type SoupStyle = "MEAT" | "SEAFOOD" | "MIXED" | "UNKNOWN"

export interface RestaurantListItem {
  id: string
  name: string
  region: Region | null
  address: string
  latitude: number | null
  longitude: number | null
  phone: string | null
  soup_style: SoupStyle
  spice_level: number
  average_price: number | null
  sentiment_score: number | null
  youtube_featured: boolean
  primary_image_url: string | null
}

export interface RestaurantMenu {
  id: number
  name: string
  price: number | null
  description: string
  is_signature: boolean
  ordering: number
}

export interface RestaurantImage {
  id: number
  image: string | null
  image_url: string | null
  caption: string
  is_primary: boolean
  ordering: number
}

export interface RestaurantDetail extends RestaurantListItem {
  detail_address: string
  opening_hours: string
  description: string
  is_visible: boolean
  menus: RestaurantMenu[]
  images: RestaurantImage[]
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface AspectScore {
  aspect: string
  label: string
  score: number
  summary: string
}

export interface Keyword {
  keyword: string
  weight: number
  frequency: number
  sentiment: "positive" | "neutral" | "negative"
}

export interface AIAnalysisResult {
  id: string
  restaurant: string
  restaurant_id: string
  status: "PENDING" | "COMPLETED" | "FAILED"
  blog_score: number | null
  youtube_score: number | null
  total_score: number | null
  review_count: number
  scores: Record<string, number>
  aspect_scores: AspectScore[]
  keywords: Keyword[]
  summary: string
  error_message: string
  is_latest: boolean
  analyzed_at: string | null
  created_at: string
  updated_at: string
}

export interface WordCloudResult {
  id: number
  restaurant: string
  analysis: number | null
  image: string | null
  image_url: string | null
  keywords: string[]
  generated_at: string
}

export interface User {
  id: number
  username: string
  email: string
  display_name: string
  role: string
  profile_image_url: string | null
  is_service_admin: boolean
  has_usable_password: boolean
}

export interface Answer {
  id: string
  question: string
  author: User | null
  content: string
  created_at: string
  updated_at: string
}

export interface Question {
  id: string
  user: User | null
  title: string
  content: string
  status: "OPEN" | "ANSWERED" | "CLOSED"
  is_public: boolean
  restaurant_name: string
  restaurant_address: string
  linked_restaurant: string | null
  linked_restaurant_name: string | null
  answers: Answer[]
  created_at: string
  updated_at: string
}

export interface ApproveReportPayload {
  region_code: string
  name?: string
  address?: string
  soup_style?: SoupStyle
  spice_level?: number
  average_price?: number
  description?: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface RestaurantListParams {
  page?: number
  q?: string
  region_code?: string
  soup_style?: string
  spice_level?: number
  min_spice?: number
  max_spice?: number
  min_price?: number
  max_price?: number
  youtube_featured?: boolean
  ordering?: string
}

export interface Job {
  status: "pending" | "running" | "done" | "error"
  log: string
}
