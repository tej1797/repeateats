// ============================================================
// Core TypeScript interfaces — one per database table.
// These match the columns in supabase/schema.sql exactly.
// ============================================================

// ─── User ────────────────────────────────────────────────────
export interface User {
  id: string;           // UUID — matches auth.users(id)
  email: string;
  name: string | null;
  city: string;
  radius_km: number;
  role: 'customer' | 'restaurant_owner' | 'influencer';
  created_at: string;   // ISO 8601 timestamp string from Postgres
}

// ─── Restaurant ───────────────────────────────────────────────
export interface Restaurant {
  id: string;
  owner_id: string | null;
  name: string;
  cuisine: string | null;
  category: string | null;   // matches the feed category slugs: indian, bbq, etc.
  city: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  hours: Record<string, string> | null;  // { mon: "11AM-10PM", ... }
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  is_live: boolean;
  accepts_dine_in: boolean;
  accepts_pickup: boolean;
  accepts_delivery: boolean;
  open_to_collabs: boolean;
  rating: number;
  review_count: number;
  created_at: string;
}

// Restaurant with its deals included (returned by GET /restaurants/[id])
export interface RestaurantWithDeals extends Restaurant {
  deals: Deal[];
}

// ─── Deal ─────────────────────────────────────────────────────
export type DealType = 'dine-in' | 'pickup' | 'delivery' | 'catering' | 'earlybird' | 'events';
export type DiscountType = 'percentage' | 'fixed' | 'free_item' | 'bogo' | 'set_price' | 'free_delivery';
export type DealScope = 'single' | 'category' | 'menu' | 'bundle';

export interface Deal {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  discount_type: DiscountType | null;
  discount_value: string | null;      // "20%" or "$10" — stored as text for flexibility
  deal_types: DealType[];
  available_days: string[];           // ['all'] or ['Mon', 'Tue'] etc.
  scope: DealScope;
  scope_detail: string | null;        // dish name, category, or bundle description
  emoji: string;
  photo_url: string | null;
  valid_from: string | null;          // date string: "2025-05-20"
  valid_until: string | null;
  max_claims: number | null;          // null = unlimited
  current_claims: number;
  is_coming: boolean;
  is_active: boolean;
  created_at: string;
}

// Deal with its restaurant info joined in (returned by GET /deals)
export interface DealWithRestaurant extends Deal {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cuisine' | 'city' | 'address' | 'rating'>;
}

// ─── Claim ────────────────────────────────────────────────────
export type ClaimStatus = 'claimed' | 'redeemed' | 'expired';

export interface Claim {
  id: string;
  deal_id: string;
  user_id: string;
  qr_code: string;        // e.g. "RE-4A7X2B"
  status: ClaimStatus;
  claimed_at: string;
  redeemed_at: string | null;
}

// Claim with deal details (for the user's claims list)
export interface ClaimWithDeal extends Claim {
  deal: Pick<Deal, 'title' | 'emoji' | 'discount_value' | 'valid_until'> & {
    restaurant: Pick<Restaurant, 'name' | 'address'>;
  };
}

// ─── Influencer ───────────────────────────────────────────────
export interface Influencer {
  id: string;
  user_id: string;
  instagram_handle: string | null;
  tiktok_handle: string | null;
  follower_count: number | null;
  niche: string | null;
  bio: string | null;
  sample_content_url: string | null;
  rating: number;
  total_collabs: number;
  created_at: string;
}

// ─── Collab ───────────────────────────────────────────────────
export type CollabStatus = 'open' | 'negotiating' | 'accepted' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'escrowed' | 'released';

export interface Collab {
  id: string;
  restaurant_id: string;
  influencer_id: string | null;
  offer_amount_min: number | null;
  offer_amount_max: number | null;
  deliverables: string | null;    // "1 Reel + 3 Stories"
  requirements: string | null;   // "8K–25K followers"
  brief: string | null;
  status: CollabStatus;
  content_url: string | null;
  payment_status: PaymentStatus;
  stripe_payment_id: string | null;
  created_at: string;
}

// Collab with restaurant and influencer joined (for the collab feed)
export interface CollabWithDetails extends Collab {
  restaurant: Pick<Restaurant, 'id' | 'name' | 'cuisine' | 'city' | 'logo_url'>;
  influencer: Pick<Influencer, 'id' | 'instagram_handle' | 'follower_count'> | null;
}

// ─── Message ──────────────────────────────────────────────────
export interface Message {
  id: string;
  collab_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

// ─── Notification ─────────────────────────────────────────────
export type NotificationType = 'deal_live' | 'claim_confirmed' | 'collab_request' | 'message';

export interface Notification {
  id: string;
  user_id: string;
  title: string | null;
  body: string | null;
  type: NotificationType | null;
  read: boolean;
  created_at: string;
}
