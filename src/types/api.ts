// ============================================================
// API request & response types
// These describe the shape of JSON bodies sent to / received
// from each route handler in src/app/api/.
// ============================================================

import type {
  Restaurant,
  Deal,
  Claim,
  ClaimWithDeal,
  Collab,
  CollabWithDetails,
  DealWithRestaurant,
  Message,
  RestaurantWithDeals,
  DealType,
  DiscountType,
  DealScope,
} from './index';

// ─── Generic API envelope ────────────────────────────────────
// Every route returns either { data } or { error }.
export type ApiSuccess<T> = { data: T; error?: never };
export type ApiError     = { error: string; data?: never };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;


// ─── GET /api/restaurants ────────────────────────────────────
export interface RestaurantsQuery {
  city?: string;
  radius_km?: number;
}
export type RestaurantsResponse = ApiResponse<Restaurant[]>;

// ─── POST /api/restaurants ───────────────────────────────────
export interface CreateRestaurantBody {
  name: string;
  cuisine?: string;
  category?: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  website?: string;
  instagram?: string;
  hours?: Record<string, string>;
  description?: string;
  accepts_dine_in?: boolean;
  accepts_pickup?: boolean;
  accepts_delivery?: boolean;
  open_to_collabs?: boolean;
}
export type CreateRestaurantResponse = ApiResponse<Restaurant>;

// ─── GET /api/restaurants/[id] ───────────────────────────────
export type RestaurantDetailResponse = ApiResponse<RestaurantWithDeals>;

// ─── PATCH /api/restaurants/[id] ─────────────────────────────
export type UpdateRestaurantBody = Partial<CreateRestaurantBody> & {
  is_live?: boolean;
};
export type UpdateRestaurantResponse = ApiResponse<Restaurant>;


// ─── GET /api/deals ──────────────────────────────────────────
export interface DealsQuery {
  city?: string;
  category?: string;     // indian | bbq | italian | etc.
  type?: DealType;       // dine-in | pickup | delivery
  tab?: 'active' | 'coming' | 'all';
  restaurant_id?: string;
}
export type DealsResponse = ApiResponse<DealWithRestaurant[]>;

// ─── POST /api/deals ─────────────────────────────────────────
export interface CreateDealBody {
  restaurant_id: string;
  title: string;
  description?: string;
  discount_type?: DiscountType;
  discount_value?: string;
  deal_types?: DealType[];
  available_days?: string[];
  scope?: DealScope;
  scope_detail?: string;
  emoji?: string;
  photo_url?: string;
  valid_from?: string;
  valid_until?: string;
  max_claims?: number;
  is_coming?: boolean;
}
export type CreateDealResponse = ApiResponse<Deal>;

// ─── GET /api/deals/[id] ─────────────────────────────────────
export type DealDetailResponse = ApiResponse<DealWithRestaurant>;

// ─── PATCH /api/deals/[id] ───────────────────────────────────
export type UpdateDealBody = Partial<CreateDealBody> & {
  is_active?: boolean;
};
export type UpdateDealResponse = ApiResponse<Deal>;


// ─── POST /api/claims ────────────────────────────────────────
export interface CreateClaimBody {
  deal_id:          string;
  timer_starts_at?: string;
  claim_for_date?:  string;
}
export type CreateClaimResponse = ApiResponse<Claim>;

// ─── GET /api/claims ─────────────────────────────────────────
export type ClaimsResponse = ApiResponse<ClaimWithDeal[]>;

// ─── POST /api/claims/[qrCode]/redeem ────────────────────────
export type RedeemClaimResponse = ApiResponse<Claim>;


// ─── GET /api/collabs ────────────────────────────────────────
export interface CollabsQuery {
  tag?: string;        // indian | bbq | gta | kw | etc.
  city?: string;
  cuisine?: string;
  status?: string;     // defaults to "open"
}
export type CollabsResponse = ApiResponse<CollabWithDetails[]>;

// ─── POST /api/collabs ───────────────────────────────────────
export interface CreateCollabBody {
  restaurant_id: string;
  offer_amount_min?: number;
  offer_amount_max?: number;
  deliverables?: string;
  requirements?: string;
  brief?: string;
}
export type CreateCollabResponse = ApiResponse<Collab>;

// ─── GET /api/collabs/[id] ───────────────────────────────────
export type CollabDetailResponse = ApiResponse<CollabWithDetails>;

// ─── PATCH /api/collabs/[id] ─────────────────────────────────
export interface UpdateCollabBody {
  status?: 'negotiating' | 'accepted' | 'completed' | 'cancelled';
  influencer_id?: string;
  content_url?: string;
  payment_status?: 'escrowed' | 'released';
}
export type UpdateCollabResponse = ApiResponse<Collab>;


// ─── GET /api/messages ───────────────────────────────────────
export interface MessagesQuery {
  collab_id: string;
}
export type MessagesResponse = ApiResponse<Message[]>;

// ─── POST /api/messages ──────────────────────────────────────
export interface CreateMessageBody {
  collab_id: string;
  text: string;
}
export type CreateMessageResponse = ApiResponse<Message>;


// ─── GET /api/google-places ──────────────────────────────────
export interface GooglePlacesQuery {
  query: string;   // e.g. "Nirvana Restaurant Brampton"
}
export interface PlaceResult {
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  hours: string | null;
  hours_raw: string[] | null;
  rating: number | null;
  types: string[];
  place_id: string;
  source?: 'google' | 'database';
}
export type GooglePlacesResponse = ApiResponse<PlaceResult[]>;
