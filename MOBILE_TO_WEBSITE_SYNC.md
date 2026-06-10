# Mobile → Website Sync Reference (repeateats.ca)

**Purpose:** Catalog every mobile app change from PRs #1–#47 and post-PR commits so the **repeateats** Next.js website can reach parity. Use this file when you switch to the website repo.

**Mobile repo:** `tej1797/repeateats-mobile` · **Latest `main`:** `73a7226`  
**Shared Supabase:** `ggerwqkheubykgsyiaic`  
**Canonical site:** `https://www.repeateats.ca`

**Related docs (already in mobile repo):**
- `WEBSITE_STRIPE_SYNC.md` — customer Stripe checkout + webhook
- `WEBSITE_STRIPE_RESTAURANT_SYNC.md` — restaurant billing (mostly edge functions now)
- `supabase/migrations/20260406_app_website_sync.sql` — `money_saved_cents`, `decrement_claims` alias

---

## How to use this document

1. **Apply all Supabase migrations** listed in §4 if the website project DB is behind.
2. **Deploy edge functions** in §5 (`claim-deal`, `restaurant-stripe`, `restaurant-stripe-webhook`).
3. **Walk the parity checklist** in §8 screen-by-screen on the website.
4. **Copy constants** from §3 (colors, limits, pricing, points) — keep website values identical to mobile source files.
5. Cross-reference §9 for exact mobile file paths to port logic.

---

## 1. PR inventory (#1–#47 + post-PR)

### Infrastructure & auth (PR #1–#11)

| PR | Summary | Website impact |
|----|---------|----------------|
| #1 | Production readiness (Expo, env, Supabase wiring) | Ensure website uses same Supabase project + env naming |
| #2–#3 | EAS init, expo-dev-client | N/A (mobile-only) |
| #4–#6 | iOS deps (rnsvg, rnscreens, SDK 54) | N/A |
| #7 | Google OAuth hash token handling | Website OAuth callback must handle implicit flow if used |
| #9–#10 | Legacy QR redemption, redeemed state fixes | Website redeem flow must accept `RE-XXX-XXX` + legacy formats |
| #11 | RepEAT+ checkout Unauthorized fix | `POST /api/stripe/checkout` must accept mobile JWT + `billing_interval` |

### Restaurant portal foundations (PR #12–#18)

| PR | Summary | Website impact |
|----|---------|----------------|
| #12–#15 | Manager mode exit, PIN wizard, owner PIN recovery, hardened recovery | Restaurant settings: manager PIN, owner PIN, OTP email template |
| #16 | OTP email template for manager recovery | Supabase Auth email template |
| #18 | `contact@contact.repeateats.ca` in support popups | Match support email sitewide |

### Customer core (PR #19–#22)

| PR | Summary | Website impact |
|----|---------|----------------|
| #19 | RepEAT+ plan page (gold theme, navigation) | `/repeat-plus` or equivalent: CAD pricing, billing intervals, feature lists |
| #20 | QR format `RE-XXX-XXX` | Scanner + manual redeem must normalize to short format |
| #22 | **Redemption-only limits** (claim/schedule does NOT consume daily/monthly) | Website claim UI + any server checks must match `claim-deal` edge function |

### Discover & UX overhaul (PR #23–#39)

| PR | Summary | Website impact |
|----|---------|----------------|
| #23 | Deal schedule UI (date headers, AM/PM happy hour) | Deal detail: schedule display, everyday copy |
| #24 | 7-day browse preview + claim gating teasers | Discover: show 7 days to everyone; gate *claiming* by tier |
| #25 | Fix radius hiding all deals | Don't hide entire feed outside radius; show week teasers |
| #26 | Uber-style Discover (compact header, floating dock) | Home layout: compact header + bottom nav dock |
| #28 | Compact header, saved deals screen, simplified dock | Saved deals page; header 2×2 status grid |
| #29 | Saved deals sync, Veg/Non-Veg toggle, dock icon | `saved_deals` table; diet filter on Discover |
| #30 | Compact Veg/Non-Veg switch | Small stacked-label toggle in header |
| #31 | Filters sheet, Google ratings, timer format | Filters bottom sheet; Places ratings overlay |
| #32 | Motion UI libraries | Optional on web (Framer Motion equivalent) |
| #33–#34 | lucide-react19, reanimated worklets | N/A (mobile build) |
| #35 | Claim date picker + Discover animations | Date picker for scheduled claims (Starter/Pro) |
| #36 | Discover footer order, plan crowns on cards | Crown badges on deal cards by user tier |
| #37 | 3D left-tilted plan crown on logo | Crown on RepEAT wordmark (gold Pro, silver Starter) |
| #38 | Header grid alignment, filters sheet tighten | 4-bar header grid specs (see §3.2) |
| #39 | Compact waiting claims, profile account, discover filters | Claims waiting vs active; profile phone/avatar |

### Post-PR #39 (direct to `main`, no numbered PR)

| Commit area | Summary | Website impact |
|-------------|---------|----------------|
| Blinkit UI rebrand | Glass surfaces, `#0C0A09` bg, `#FF6B00` accent, ambient gradients | Full customer CSS token update (§3.1) |
| Metallic gold `#FFBF00` | Replaced older `#D4AF37` | Gold accents sitewide |
| Restaurant blue rebrand | `#1249A9` portal, `#22C55E` redeemed accent | Restaurant dashboard theme (§3.3) |
| Tier trial + claim windows | 3-day customer Pro trial; 45/120/180 min windows; scheduled claims | DB triggers + claim flow (§4) |
| Restaurant billing | Per-location Stripe, 3-month trial, metering, anti-cheat | Edge functions + `restaurants` columns (§4, §5) |
| Restaurant analytics | `get_restaurant_dashboard_stats` RPC, RLS fix | Dashboard must call RPC not raw claims |
| CAD pricing | Customer plans $2.99/$3.99 mo; deferred trial billing | Stripe prices + copy (§6) |
| Customer points (#46–#47) | Full points economy + UI | **Major website gap** — §2, §4, §8 |

### Points & home UI (PR #46–#47 + follow-ups)

| PR / commit | Summary | Website impact |
|-------------|---------|----------------|
| #46 | Home redemption counter uses `effectiveDailyCap`; points shortcuts | Header `X/Y redeemed` includes bonus redemptions |
| #47 | Points economy: 10 pts/scan, 50 pts extra redemption | Match RPC costs (§2) |
| Post-#47 | Inline `pro`/`starter` tag on logo; silver Starter theme | Header wordmark + RepEAT+ page silver palette |
| Post-#47 | Horizontal rewards scroll (low→high cost); no tier labels in UI | `/points` page layout |
| Post-#47 | 4-bar compact header grid (28px pills, 3px gap) | Discover header dimensions (§3.2) |

**Note:** PRs #17, #21, #27, #40–#45 were never merged as numbered PRs; their work landed via the commits above.

---

## 2. Customer points system (highest-priority website gap)

### Economy (canonical — must match DB RPCs)

| Action | Points |
|--------|--------|
| Signup bonus | **50** |
| Per QR scan redemption | **10** |
| First scan bonus (one-time) | **+15** |
| Reward: +1 redemption today | **50** |
| Reward: claim tomorrow's deals (24h) | **55** (free tier only) |
| Reward: +1 redemption this month | **90** |
| Reward: RepEAT+ 3-day extension | **70** |
| Reward: RepEAT+ 7-day extension | **135** |

**Source of truth:** `src/constants/customerPoints.ts` + migrations `20260616_scan_10_redeem_50pts.sql`, `20260617_plus_extension_costs.sql`.

### Database tables & RPCs

- `customer_points` — balance, bonus counters, `tomorrow_unlock_until`
- `customer_points_ledger` — audit trail
- `customer_award_signup_points(uuid)` — trigger on user insert
- `customer_award_scan_points(uuid, uuid)` — called from `claim-deal` on redeem
- `customer_redeem_points_reward(text)` — client calls to spend points
- `customer_consume_redemption_bonus(uuid, text)` — called from `claim-deal` when using bonus slots

### UI requirements (mobile reference)

| Screen | Behavior |
|--------|----------|
| Discover header | `☆ {balance} pts` in glass bar (no chip box); tap → points page |
| Discover header | `X/Y redeemed` uses `effectiveDailyCap` = tier daily + `bonus_daily_redemptions` |
| Claims tab | Points balance line linking to points page |
| Points page | Single horizontal scroll of reward cards, sorted **low → high** by cost |
| Points page | Hide tier section labels ("Tier 1", band ranges) — metadata is internal only |
| Points page | Filter rewards via `isRewardVisible()` — free-only rewards hidden for paid tiers |
| Wallet / Profile | Links to points + RepEAT+ |

### Hooks to port

- `src/hooks/useCustomerPoints.ts` — balance, redeem, refetch
- `src/hooks/useClaimLimits.ts` — redemption counts, bonus caps, `tomorrowUnlockActive`

---

## 3. Design tokens & UI specs

### 3.1 Customer UI (`src/constants/customerUI.ts`)

```css
/* Suggested CSS variables for website */
--customer-bg: #0C0A09;
--customer-bg-elevated: #141210;
--customer-accent: #FF6B00;
--customer-accent-soft: rgba(255,107,0,0.16);
--customer-gold: #FFBF00;
--customer-gold-deep: #CC9900;
--customer-text-primary: #FAFAF9;
--customer-text-secondary: #A8A29E;
--customer-text-muted: #78716C;
--customer-glass-bg: rgba(28,26,24,0.55);
--customer-glass-border: rgba(255,255,255,0.14);
--customer-card-radius: 16px;
--customer-dock-radius: 32px;
--customer-filter-height: 36px;
--customer-filter-radius: 12px;
```

**Metallic gold** (`src/constants/metallicGold.ts`): base `#FFBF00`, gradients for Pro badges/buttons.  
**Metallic silver** (`src/constants/metallicSilver.ts`): Starter tier — mid `#B8B8B8`, used for crown, plan tag, Starter CTA.

**RepEAT+ page theme** (`src/constants/repeatPlusTheme.ts`): dark `#0A0A0A` surfaces; gold for Pro, silver for Starter.

### 3.2 Discover compact header (`DiscoverCompactHeader.tsx`)

2×2 grid, right column width = 170px (`90 + 8 gap + 72`):

| Cell | Content | Size |
|------|---------|------|
| Top-left | `X/Y` + `redeemed` pill | 90×28px glass bar |
| Top-right | Veg/Non-Veg compact toggle | 72×28px |
| Bottom-left | Active claim timer chip | 90×28px |
| Bottom-right | `☆ {pts} pts` (tappable) | 72×28px |

- Row gap: **3px**, column gap: **8px**
- Logo left: `RepEAT` wordmark + 3D crown + inline plan tag (`pro` gold / `starter` silver)
- Location row below logo: pin icon + city + radius km

### 3.3 Restaurant portal UI (`src/constants/restaurantUI.ts`)

```css
--restaurant-bg: #0A0A0A;
--restaurant-accent: #1249A9;
--restaurant-accent-light: #5B9BD5;
--restaurant-redeem-accent: #22C55E;  /* redeemed stats, success */
```

Floating bottom dock (Instagram-style), blue gradient dashboard header.

### 3.4 Discover layout patterns

- **Floating bottom dock** — Home, Claims, Saved, Wallet, Profile (customer); Dashboard, Deals, Scanner, Analytics, etc. (restaurant)
- **Cuisine carousel** — horizontal pill row
- **Filter pills** — BOGO, % off, etc. + Filters sheet (sort, rating, price)
- **7-day day tabs** — everyone browses 7 days; padlocks/teasers on days outside claim window
- **Section panels** — glass `SectionPanel`, `AmbientBackground` gradients
- **Deal cards** — scarcity, Google rating overlay, plan crown on card when applicable
- **Title case** deal names (`formatDisplayText.ts`)

### 3.5 Claims UI

- **Waiting** (`scheduled`) — compact row, no QR yet
- **Active** (`claimed`) — QR code `RE-XXX-XXX`, countdown chip
- **Past** — redeemed/expired rows
- Visit window timer from `timer_starts_at` → `expires_at`

---

## 4. Database schema & migrations (apply in order)

All paths: `supabase/migrations/`

| Migration | What it adds |
|-----------|--------------|
| `20260201_push_tokens.sql` | Push notification tokens |
| `20260202_push_triggers.sql` | Push triggers |
| `20260203_expiring_claims_cron.sql` | Claim expiry cron |
| `20260301_saved_v2.sql` | Saved deals v2 |
| `20260401_collabs_phase6.sql` | Creator collabs |
| `20260402_scarcity_push.sql` | Scarcity push |
| `20260403_claim_timer.sql` | Claim timer columns |
| `20260404_collabs_deadline.sql` | Collab deadlines |
| `20260405_manager_mode.sql` | Manager PIN, owner PIN, `is_paused`, payouts |
| `20260406_app_website_sync.sql` | `money_saved_cents`, `decrement_claims()` |
| `20260407_diet_type.sql` | `deals.diet_type` enum (veg/egg/nonveg) |
| `20260603_expire_claims_cron.sql` | Expire claims cron |
| `20260606_restaurant_covers_bucket.sql` | Restaurant cover images bucket |
| `20260606_yearly_tier.sql` | `yearly` customer tier |
| `20260608_restaurant_billing.sql` | Restaurant tier, billing_mode, metering, trial |
| `20260609_customer_trial.sql` | 3-day customer Pro trial columns + trigger |
| `20260610_backfill_customer_trial.sql` | Backfill trials for existing users |
| `20260610_claim_windows.sql` | `claim_for_date`, `timer_starts_at`, `window_minutes`, `scheduled` status |
| `20260611_user_profile_fields.sql` | `phone`, `avatar_url`, `user-avatars` bucket |
| `20260612_restaurant_claims_read.sql` | RLS: owners read claims on their deals |
| `20260613_restaurant_dashboard_stats_rpc.sql` | `get_restaurant_dashboard_stats()` |
| `20260614_customer_points.sql` | Points tables + RPCs (initial costs) |
| `20260615_extra_claim_today_10pts.sql` | Intermediate cost tweak (superseded) |
| `20260616_scan_10_redeem_50pts.sql` | **Current** scan/redeem costs |
| `20260617_plus_extension_costs.sql` | **Current** plus_3d=70, plus_7d=135 |

### Tier limits (customer)

| Tier | Daily redemptions | Monthly redemptions | Claim lookahead | Visit window |
|------|-------------------|---------------------|-----------------|--------------|
| free | 1 | 3 | 1 day (+1 if tomorrow_unlock) | 45 min |
| starter | 3 | 20 | 2 days | 120 min |
| pro / yearly / trial | 3 | 30 | 7 days | 180 min |

**Source:** `src/lib/tierLimits.ts`, `claim-deal/index.ts`

**Important:** Limits count **`status = 'redeemed'`** only (by `redeemed_at`), not claims/schedules.

### Tier limits (restaurant)

| Tier | Max active deals | Featured | Collabs | Analytics |
|------|------------------|----------|---------|-----------|
| free | 2 | No | No | basic |
| starter | 8 | No | Yes | basic |
| pro | 999 | Yes | Yes | full |
| trial (3 months) | 999 | Yes | Yes | full |

**Metering:** `subscription_plus_metering` — first **60** billable scanner redemptions/month free, then **$0.50** each.  
*(Migration comment says 30; live code in `restaurantTierLimits.ts` + `claim-deal` uses 60 — match code.)*

---

## 5. Edge functions (Supabase)

| Function | Purpose | Website must |
|----------|---------|--------------|
| `claim-deal` | Atomic claim + HMAC QR + redeem + limits + points + metering | Customer claim/redeem must call this (not direct DB inserts) |
| `restaurant-stripe` | Per-location restaurant checkout | Deploy + `STRIPE_SECRET_KEY` secret |
| `restaurant-stripe-webhook` | Sync `restaurants` tier from Stripe | Webhook URL in Stripe dashboard |

### `claim-deal` actions

**Claim:** `POST { action: 'claim', deal_id, timer_starts_at?, claim_for_date? }`  
- Returns `{ claim, reused }` with `qr_code`, `status` (`scheduled`|`claimed`), `expires_at`
- Enforces tier lookahead + deal validity
- Does **not** consume redemption limits

**Redeem:** `POST { action: 'redeem', qr_code }` (restaurant scanner JWT)  
- Normalizes `RE-XXX-XXX` + legacy formats
- Checks visit window, redemption limits, awards scan points
- Sets `redemption_metered`, `redeemed_via: 'scanner'`, increments `restaurant_billing_usage`

---

## 6. Stripe & billing contracts

### Customer (website-owned)

See `WEBSITE_STRIPE_SYNC.md`. Key fields on `users`:

- `repeat_plus_tier`: `free` | `starter` | `pro` | `yearly`
- `repeat_plus_plan`, `stripe_customer_id`, `stripe_subscription_id`, `repeat_plus_expires_at`
- `repeat_plus_trial_*` — do **not** reset `repeat_plus_trial_used` on subscribe

**CAD pricing** (`src/constants/repeatPlusPlans.ts`):

| Plan | Monthly | Quarterly (per mo) | Yearly (per mo) |
|------|---------|-------------------|-----------------|
| Starter | $2.99 | $2.66 ($7.99/3mo) | $2.08 ($24.99/yr) |
| Pro | $3.99 | $3.33 ($9.99/3mo) | $2.49 ($29.99/yr) |

Checkout API must accept `billing_interval`: `monthly` | `quarterly` | `yearly`.

### Restaurant (edge-function-owned)

See `WEBSITE_STRIPE_RESTAURANT_SYNC.md`. Per **`restaurant_id`**:

| Plan | Flat/mo | Usage/mo (−$15) |
|------|---------|-----------------|
| Starter | $49 | $34 + overage |
| Pro | $99 | $84 + overage |

3-month Pro trial on signup; deferred billing (card saved, charge at trial end).

---

## 7. Business logic modules to port

| Module | Path | Website use |
|--------|------|-------------|
| Tier limits | `src/lib/tierLimits.ts` | Claim gating, header caps, RepEAT+ copy |
| Deal visibility | `src/lib/dealVisibility.ts` | 7-day browse vs tier claim window |
| Discover filters | `src/lib/discoverFilters.ts` | Sort, rating, price filters |
| Claim limits hook | `src/hooks/useClaimLimits.ts` | Redemption counter |
| Customer points hook | `src/hooks/useCustomerPoints.ts` | Points page |
| Repeat+ plans | `src/constants/repeatPlusPlans.ts` | Pricing page |
| Restaurant plans | `src/constants/restaurantPlans.ts` | Restaurant billing page |
| Restaurant tier limits | `src/lib/restaurantTierLimits.ts` | Deal caps, metering display |
| Format currency | `src/lib/formatCurrency.ts` | CAD display |
| Format display text | `src/lib/formatDisplayText.ts` | Title case names |

---

## 8. Website parity checklist

### Customer-facing (repeateats.ca)

- [ ] **Design tokens** — `#0C0A09` customer dark, `#FF6B00` accent, `#FFBF00` gold, glass surfaces
- [ ] **Discover home** — compact 4-bar header, floating dock, cuisine carousel, 7-day tabs
- [ ] **Filters** — sheet with sort/rating/price; Veg/Non-Veg toggle; diet_type filter on deals
- [ ] **Tier gating** — browse 7 days, claim 1/2/7 by tier; upgrade teasers on locked days
- [ ] **Claim flow** — call `claim-deal`; scheduled claims for Starter/Pro; date/time picker
- [ ] **QR display** — `RE-XXX-XXX` format; visit window countdown
- [ ] **Redemption limits** — count redemptions only; show `effectiveDailyCap` with bonus slots
- [ ] **RepEAT+ page** — CAD pricing, monthly/quarterly/yearly, gold Pro + silver Starter themes
- [ ] **3-day Pro trial** — auto on signup; Pro limits while trial active
- [ ] **Points system** — balance in header, `/points` page, rewards redeem via RPC
- [ ] **Claims page** — waiting vs active vs past; points link
- [ ] **Saved deals** — sync with `saved_deals` table
- [ ] **Profile** — phone, avatar upload (`user-avatars` bucket), money saved (`money_saved_cents`)
- [ ] **Wallet** — savings + RepEAT+ status + points entry
- [ ] **Stripe checkout** — `billing_interval`, trial-aware webhook writes
- [ ] **Google OAuth** — redirect URLs for web + mobile

### Restaurant portal (website)

- [ ] **Blue rebrand** — `#1249A9` accent, `#22C55E` redeemed stats
- [ ] **Dashboard** — `get_restaurant_dashboard_stats` RPC (not raw claims query)
- [ ] **Analytics** — separate claims vs redeemed counts; use `redeemed_at` not `created_at`
- [ ] **Scanner** — manual redeem via `claim-deal`; large green redeem button
- [ ] **Restaurant billing** — per-location plans, flat vs usage, 3-month trial, deferred charge
- [ ] **Manager mode** — PIN lock, tab permissions, owner PIN recovery
- [ ] **Deal limits** — enforce max active deals by `restaurant_tier`
- [ ] **Collabs** — phase 6 schema
- [ ] **Pause restaurant** — `is_paused` hides from Discover

### Backend / shared

- [ ] All migrations in §4 applied to production Supabase
- [ ] `claim-deal` deployed with `CLAIM_QR_SECRET`
- [ ] `restaurant-stripe` + webhook deployed with `STRIPE_SECRET_KEY`
- [ ] `decrement_claims` alias works (website legacy name)
- [ ] `money_saved_cents` populated on redemption
- [ ] `customer_effective_tier()` used where SQL tier checks needed
- [ ] Contact email: `contact@contact.repeateats.ca`

---

## 9. Implementation priority (recommended order)

### P0 — Backend correctness (breaks app if wrong)
1. Apply migrations §4 (especially points, trials, claim windows, restaurant billing)
2. Deploy `claim-deal` v18+ with points + bonus consumption
3. Fix website Stripe webhooks (`repeat_plus_tier`, trial columns)
4. Ensure redemption limits match edge function (redeemed-only counting)

### P1 — High-visibility customer gaps
1. Points system (page + header + RPC wiring)
2. Discover header 4-bar grid + redemption counter with bonuses
3. 7-day browse + tier claim gating
4. RepEAT+ page CAD pricing + silver/gold themes
5. Claim windows + scheduled status UI

### P2 — Restaurant portal
1. Dashboard stats RPC + analytics redeemed fix
2. Blue/green rebrand
3. Per-location billing UI (or link to edge checkout)
4. Manager mode / PIN recovery

### P3 — Polish
1. Filters sheet, ratings overlay, motion
2. Saved deals, profile avatar/phone
3. Title case, spacing, dock styling

---

## 10. Quick reference — key mobile files

```
src/constants/customerUI.ts          # Customer colors
src/constants/restaurantUI.ts        # Restaurant colors
src/constants/customerPoints.ts      # Points economy + rewards
src/constants/repeatPlusPlans.ts     # Customer CAD pricing
src/constants/restaurantPlans.ts     # Restaurant CAD pricing
src/constants/metallicGold.ts        # Pro gold palette
src/constants/metallicSilver.ts      # Starter silver palette
src/constants/repeatPlusTheme.ts     # RepEAT+ page theme
src/lib/tierLimits.ts                # Customer tier logic
src/lib/dealVisibility.ts            # Browse vs claim windows
src/lib/restaurantTierLimits.ts      # Restaurant tier + metering
src/hooks/useClaimLimits.ts          # Redemption caps
src/hooks/useCustomerPoints.ts       # Points balance/redeem
supabase/functions/claim-deal/       # Claim + redeem API
supabase/migrations/                 # All schema changes
WEBSITE_STRIPE_SYNC.md               # Customer Stripe contract
WEBSITE_STRIPE_RESTAURANT_SYNC.md    # Restaurant Stripe contract
```

---

## 11. When you switch to the `repeateats` website repo

1. Clone/open `tej1797/repeateats` (Next.js).
2. Copy this file + the two `WEBSITE_STRIPE_*.md` docs into the website repo (or symlink).
3. Grep website for stale values: old gold `#D4AF37`, redemption-on-claim logic, missing `customer_points`, legacy `is_repeat_plus`.
4. Compare website `app/` routes against §8 checklist.
5. Run Supabase migration diff: `supabase db diff` or compare applied migrations list.

**Supabase project URL:** `https://ggerwqkheubykgsyiaic.supabase.co`

---

*Generated from mobile `main` @ `73a7226`. Update this doc when new mobile PRs merge.*
