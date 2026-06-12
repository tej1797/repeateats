// Complete database type definitions matching Supabase schema.
// These are the raw row shapes as returned directly from Supabase queries.
// For enriched/joined types used in the UI see src/types/index.ts.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row:    UserRow
        Insert: UserInsert
        Update: Partial<UserInsert>
      }
      restaurants: {
        Row:    RestaurantRow
        Insert: RestaurantInsert
        Update: Partial<RestaurantInsert>
      }
      deals: {
        Row:    DealRow
        Insert: DealInsert
        Update: Partial<DealInsert>
      }
      claims: {
        Row:    ClaimRow
        Insert: ClaimInsert
        Update: Partial<ClaimInsert>
      }
      influencers: {
        Row:    InfluencerRow
        Insert: InfluencerInsert
        Update: Partial<InfluencerInsert>
      }
      collabs: {
        Row:    CollabRow
        Insert: CollabInsert
        Update: Partial<CollabInsert>
      }
      messages: {
        Row:    MessageRow
        Insert: MessageInsert
        Update: Partial<MessageInsert>
      }
      notifications: {
        Row:    NotificationRow
        Insert: NotificationInsert
        Update: Partial<NotificationInsert>
      }
    }
  }
}

// ─── users ────────────────────────────────────────────────────────────────────
export interface UserRow {
  id:                  string
  email:               string
  name:                string | null
  display_name:        string | null
  avatar_url:          string | null
  city:                string
  radius_km:           number
  role:                'customer' | 'restaurant_owner' | 'influencer'
  favourite_cuisine:   string | null
  total_claimed:       number
  total_saved_cents:   number
  member_since:        string | null
  is_repeat_plus:      boolean
  repeat_plus_since:   string | null
  streak_days:         number
  last_claim_date:     string | null
  created_at:          string
}

export type UserInsert = Omit<UserRow, 'created_at' | 'total_claimed' | 'total_saved_cents' | 'streak_days'>
  & Partial<Pick<UserRow, 'created_at' | 'total_claimed' | 'total_saved_cents' | 'streak_days'>>

// ─── restaurants ──────────────────────────────────────────────────────────────
export interface RestaurantRow {
  id:                   string
  owner_id:             string | null
  name:                 string
  cuisine:              string | null
  category:             string | null
  city:                 string
  address:              string | null
  lat:                  number | null
  lng:                  number | null
  phone:                string | null
  website:              string | null
  instagram:            string | null
  hours:                Record<string, string> | null
  logo_url:             string | null
  cover_url:            string | null
  description:          string | null
  is_live:              boolean
  accepts_dine_in:      boolean
  accepts_pickup:       boolean
  accepts_delivery:     boolean
  open_to_collabs:      boolean
  rating:               number
  review_count:         number
  google_place_id:      string | null
  google_rating:        number | null
  google_review_count:  number | null
  google_reviews:       Json | null
  google_photos:        Json | null
  last_synced_at:       string | null
  created_at:           string
}

export type RestaurantInsert = Omit<RestaurantRow, 'id' | 'created_at' | 'rating' | 'review_count'>
  & Partial<Pick<RestaurantRow, 'id' | 'created_at' | 'rating' | 'review_count'>>

// ─── deals ────────────────────────────────────────────────────────────────────
export interface DealRow {
  id:              string
  restaurant_id:   string
  title:           string
  description:     string | null
  discount_type:   'percentage' | 'fixed' | 'free_item' | 'bogo' | 'bogo_half' | 'bogo_lb' | 'set_price' | 'free_delivery' | null
  diet_type:       'veg' | 'nonveg' | 'egg' | null
  price_tag:       'under6' | 'under12' | null
  discount_value:  string | null
  deal_types:      string[]
  available_days:  string[]
  scope:           'single' | 'category' | 'menu' | 'bundle'
  scope_detail:    string | null
  emoji:           string
  photo_url:       string | null
  valid_from:      string | null
  valid_until:     string | null
  max_claims:      number | null
  current_claims:  number
  is_coming:       boolean
  is_active:       boolean
  created_at:      string
}

export type DealInsert = Omit<DealRow, 'id' | 'created_at' | 'current_claims'>
  & Partial<Pick<DealRow, 'id' | 'created_at' | 'current_claims'>>

// ─── claims ───────────────────────────────────────────────────────────────────
export interface ClaimRow {
  id:           string
  deal_id:      string
  user_id:      string
  qr_code:      string
  status:       'claimed' | 'redeemed' | 'expired'
  claimed_at:   string
  redeemed_at:  string | null
}

export type ClaimInsert = Omit<ClaimRow, 'id' | 'claimed_at' | 'redeemed_at'>
  & Partial<Pick<ClaimRow, 'id' | 'claimed_at' | 'redeemed_at'>>

// ─── influencers ──────────────────────────────────────────────────────────────
export interface InfluencerRow {
  id:                  string
  user_id:             string
  display_name:        string | null
  avatar_url:          string | null
  instagram_handle:    string | null
  instagram_verified:  boolean
  tiktok_handle:       string | null
  follower_count:      number | null
  follower_range:      string | null
  primary_platform:    string | null
  niche:               string | null
  bio:                 string | null
  city:                string | null
  sample_content_url:  string | null
  avg_rating:          number
  total_collabs:       number
  etransfer_email:     string | null
  paypal_email:        string | null
  preferred_payment:   'etransfer' | 'paypal' | 'bank' | null
  created_at:          string
}

export type InfluencerInsert = Omit<InfluencerRow, 'id' | 'created_at' | 'avg_rating' | 'total_collabs'>
  & Partial<Pick<InfluencerRow, 'id' | 'created_at' | 'avg_rating' | 'total_collabs'>>

// ─── collabs ──────────────────────────────────────────────────────────────────
export interface CollabRow {
  id:                   string
  restaurant_id:        string
  influencer_id:        string | null
  offer_amount_min:     number | null
  offer_amount_max:     number | null
  creator_rate:         number | null
  deliverables:         string | null
  requirements:         string | null
  brief:                string | null
  status:               'open' | 'negotiating' | 'accepted' | 'completed' | 'cancelled'
  draft_content_url:    string | null
  final_post_url:       string | null
  payment_deposited_at: string | null
  payment_released_at:  string | null
  notes:                string | null
  deadline:             string | null
  created_at:           string
}

export type CollabInsert = Omit<CollabRow, 'id' | 'created_at'>
  & Partial<Pick<CollabRow, 'id' | 'created_at'>>

// ─── messages ─────────────────────────────────────────────────────────────────
export interface MessageRow {
  id:         string
  collab_id:  string
  sender_id:  string
  text:       string
  created_at: string
}

export type MessageInsert = Omit<MessageRow, 'id' | 'created_at'>
  & Partial<Pick<MessageRow, 'id' | 'created_at'>>

// ─── notifications ────────────────────────────────────────────────────────────
export interface NotificationRow {
  id:         string
  user_id:    string
  title:      string | null
  body:       string | null
  type:       'deal_live' | 'claim_confirmed' | 'collab_request' | 'message' | null
  read:       boolean
  created_at: string
}

export type NotificationInsert = Omit<NotificationRow, 'id' | 'created_at' | 'read'>
  & Partial<Pick<NotificationRow, 'id' | 'created_at' | 'read'>>
