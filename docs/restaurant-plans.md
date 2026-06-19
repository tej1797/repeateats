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
- **Monthly + usage** — 60 free redemptions/month, then **CA$0.005 (0.5¢) each**.
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
collab escrow, an analytics dashboard, mobile plans screen.

**Not built yet (shared backend — coordinate web+mobile):**
1. Restaurant subscription checkout (Stripe products/prices for $49/$99 flat,
   $34/$84 + metered usage; trial-end first charge).
2. Webhook → `restaurant_tier` / `billing_mode` sync on subscription events.
3. Usage metering (aggregate scanner redemptions → Stripe metered usage; the
   60-free-then-0.5¢ overage).
4. Trial-end downgrade job (flip to Free when `trial_ends_at` passes unpaid).
5. Tier gating: active-deal limit (4/8/∞), Free 60-redemption cap, Discover
   placement boost + featured slot, analytics basic-vs-full + integrity
   dashboard, diner insights, collab view-only on Free, deal scheduling.
6. Anti-circumvention scan-rate monitoring.

**Stripe products to create (Tejas — required before checkout works):**
restaurant Starter/Pro × {flat, usage-base} × {monthly, yearly} price IDs, plus
a metered price for the 0.5¢/redemption overage.
