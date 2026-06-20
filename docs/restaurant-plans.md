# RepEAT for Restaurants — Plans & Pricing (finalized spec)

Single source of truth for the restaurant subscription ladder. Web and mobile
must match this. Billing is **per restaurant location**, not per owner account —
each location has its own subscription.

## Trial
- New locations get a **90-day Pro trial** (full Pro access, CA$0 due).
- Card is saved during the trial; **first charge happens when the trial ends**.
- If no plan is chosen by trial end, the location **drops to Free**.

## Billing modes (Starter & Pro only)
- **Flat monthly** — unlimited scanner-verified QR redemptions included.
- **Monthly + usage** — 60 free redemptions/month, then **CA$0.05 (5¢) each**.
  Only scanner-verified QR redemptions count toward usage.

## Monthly vs Yearly
- Yearly billing = **20% off** the monthly rate (annual commitment).

## The ladder

| | **Free** | **Starter** | **Pro** (Best for growth) |
|---|---|---|---|
| Flat monthly | CA$0 | CA$49/mo | CA$99/mo |
| Monthly + usage | — (not offered on Free) | CA$34/mo + usage | CA$84/mo + usage |
| **Active deals** | **4** | **8** | **Unlimited** |
| **QR redemptions** | **60 / month (hard cap)** | per billing mode | per billing mode |
| **Discover placement** | Standard (no boost) | Improved (ranking boost) | Priority + featured slot |
| **Creator collabs** | **View-only** (browse, can't post — upsell teaser) | Yes | Unlimited |
| **Analytics** | "Redemptions this month" stat only | Basic dashboard | Full + integrity dashboard |
| **Diner insights** | No | No | RepEAT+ diner insights |
| **Deal scheduling** | Today-only | Future-day scheduling | Future-day scheduling |

### Free tier — exact definition
- **4 active deals** max.
- **60 scanner-verified redemptions per month**, then deals can't be redeemed
  until the next month (or the owner upgrades). Mirrors the paid usage bucket.
- **Discover placement: Standard** — listed but not boosted; paid tiers outrank.
- **Creator collabs: view-only** — the collab marketplace is browsable so the
  owner sees the opportunity, but posting/negotiating requires Starter+.
  (Upsell teaser.)
- **Analytics:** only a single "redemptions this month" number — no dashboard.
- **No diner insights.**
- **Today-only deals** — no future-day scheduling.

## Discover placement — definition
How prominently a location's deals appear in the customer Discover feed
(Trending, cuisine rows, Featured):
- **Standard** (Free): normal ranking by relevance/distance/recency, no boost.
- **Improved** (Starter): ranking boost above equivalent Free listings.
- **Priority + featured slot** (Pro): top-of-feed priority **plus** a reserved
  spot in a featured carousel/row.

## Anti-circumvention policy (shown on the plans screen)
Deals must be redeemed through the RepEAT scanner. Honoring app claims
off-platform violates the agreement and skews analytics. Low scan rates may
trigger a review.

## Implementation status (2026-06-17)
**Built:** schema (`restaurant_tier`, `billing_mode`, `trial_*`,
`stripe_customer_id`, `stripe_subscription_id`, `subscription_expires_at`),
trial countdown badge, Stripe payment-methods storage per restaurant customer,
collab escrow, an analytics dashboard, mobile + web plans screens.

**Billing engine — already deployed as Supabase edge functions (shared by web+mobile):**
- `restaurant-stripe` — checkout/portal. Auth via Supabase JWT (portal-agnostic).
  Uses **dynamic price_data** — NO pre-created Stripe products / price-ID env vars.
  Pricing in-code: flat starter $49 / pro $99; yearly = 20% off ($39/$79);
  usage mode = flat − $15 ($34 / $84). Sets `trial_end` so first charge lands at
  trial end. Web calls it via `supabase.functions.invoke('restaurant-stripe', …)`.
- `restaurant-stripe-webhook` — maps Stripe subscription events → restaurants
  row (`restaurant_tier`, `billing_mode`, `stripe_subscription_id`,
  `subscription_expires_at`); canceled/unpaid/past_due → free.
  Secret: `STRIPE_RESTAURANT_WEBHOOK_SECRET`.
- Trial-end downgrade: no cron — `resolveEffectiveRestaurantTier()` returns
  'trial' until `trial_ends_at`, then falls to the stored tier (free if unpaid).

**Not built yet:**
1. Free **60/mo restaurant redemption hard cap** — must be enforced server-side
   in `claim-deal` (count scanner-verified redemptions for the restaurant in the
   current Toronto month; block at 60 on free tier). Owned by mobile/edge.
2. Usage metering (60 free then 5¢ → Stripe Meter + usage reporting from the
   redeem path). Owned by mobile/edge. **Open question:** ship real metering now
   (needs a Stripe Meter + metered price) or keep usage-mode as the discounted
   flat price for v1 and add metering later.
3. Tier gating polish: Discover placement boost + featured slot, analytics
   basic-vs-full + integrity dashboard, diner insights, collab view-only on Free,
   deal scheduling. Active-deal cap is enforced client-side both platforms (a DB
   trigger could harden it later).
4. Anti-circumvention scan-rate monitoring.

**Stripe products to create (Tejas):** none for flat billing (dynamic price_data).
Only if shipping real usage metering now: one Stripe **Meter** (e.g. event
`restaurant_redemption`) + a metered price per plan.
