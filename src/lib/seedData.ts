// Seed-data flag — single source of truth.
// Set NEXT_PUBLIC_USE_SEED_DATA=true in .env.local to include restaurants_seed
// and deals_seed in customer-facing queries. Never set this in production.
//
// Rules:
//   ON  → customer Discover feed, search, restaurant detail: union real + seed tables
//   OFF → only real restaurants/deals are shown (production default)
//
// Never-seed routes (seed data NEVER appears regardless of flag):
//   /api/stats           — admin metrics, real data only
//   /api/claims (POST)   — claim redemption, real deals only
//   /api/restaurants (POST/PATCH) — owner write paths, real table only
//   Restaurant portal    — all queries are owner-scoped, real table only

export const USE_SEED_DATA =
  process.env.NEXT_PUBLIC_USE_SEED_DATA === 'true';
