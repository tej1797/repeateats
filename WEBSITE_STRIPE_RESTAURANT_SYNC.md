# Website ↔ Mobile Restaurant Billing (repeateats.ca)

Restaurant subscriptions are **per `restaurant_id`** (location), not per `owner_id`. One owner may operate many locations — each has its own Stripe customer + subscription.

## Mobile checkout (primary)

The app calls the Supabase edge function **`restaurant-stripe`** (not the website). Deploy it and add a **custom** Edge Function secret `STRIPE_SECRET_KEY` = your Stripe secret (`sk_test_...` / `sk_live_...`).

> **Note:** `SUPABASE_SECRET_KEYS` in the dashboard is a **built-in default** (Supabase API keys JSON) — it is **not** your Stripe key. You must add `STRIPE_SECRET_KEY` under **Custom secrets**.

Webhook: **`restaurant-stripe-webhook`** at  
`https://ggerwqkheubykgsyiaic.functions.supabase.co/restaurant-stripe-webhook`

### Usage vs flat pricing

| Plan | Flat monthly | Usage monthly ($15 less) |
|------|-------------|--------------------------|
| Starter | $49/mo | $34/mo + $0.50/redemption after 30 |
| Pro | $99/mo | $84/mo + $0.50/redemption after 30 |

Yearly uses the same $15 discount on the per-month equivalent.

## Optional website endpoints (legacy / web portal)

### 1. Checkout — `POST /api/stripe/restaurant/checkout`

Restaurant portal JWT (`Authorization: Bearer <restaurant-supabase-jwt>`).

```json
{
  "plan": "starter" | "pro" | "starter_yearly" | "pro_yearly",
  "billing_mode": "subscription_only" | "subscription_plus_metering",
  "billing_interval": "monthly" | "yearly",
  "restaurant_id": "<uuid>",
  "success_url": "repeateats://restaurant-plus?status=success&plan=pro",
  "cancel_url": "repeateats://restaurant-plus?status=cancel"
}
```

**Auth rules:**
- Verify JWT `sub` === `restaurants.owner_id` for the given `restaurant_id`
- Attach Stripe Customer metadata: `restaurant_id`, `billing_mode`

Return `{ "url": "<stripe-checkout-url>" }`.

### 2. Portal — `POST /api/stripe/restaurant/portal`

```json
{
  "restaurant_id": "<uuid>",
  "return_url": "repeateats://settings"
}
```

### 3. Metered usage — `POST /api/stripe/restaurant/meter` (optional cron or on redeem)

When `billing_mode = subscription_plus_metering` and monthly billable redemptions exceed **30**, report overage to Stripe metered price ($0.50 USD each).

```json
{
  "restaurant_id": "<uuid>",
  "month_key": "2026-06",
  "billable_redemptions": 35,
  "metered_redemptions": 5
}
```

Mobile edge function `claim-deal` increments `restaurant_billing_usage` on each **scanner** redemption. Website cron can sync overage to Stripe daily.

### 4. Webhook — update `restaurants` row

On `checkout.session.completed` / `customer.subscription.updated` / `deleted`:

```sql
update public.restaurants set
  restaurant_tier = 'pro',
  billing_mode = 'subscription_plus_metering',
  stripe_customer_id = 'cus_...',
  stripe_subscription_id = 'sub_...',
  subscription_expires_at = '2026-07-06T00:00:00Z'
where id = '<restaurant_id>';
```

On cancel / lapse → `restaurant_tier = 'free'`, clear `subscription_expires_at`.

| Plan slug | `restaurant_tier` |
|-----------|-------------------|
| Cancelled / lapsed | `free` |
| `starter` / `starter_yearly` | `starter` |
| `pro` / `pro_yearly` | `pro` |

**Trial:** New restaurants get `restaurant_tier = 'trial'`, `trial_ends_at = now() + 3 months` via DB trigger. No Stripe charge until they subscribe after trial.

## Metering & anti-cheat (mobile + Supabase)

- Only redemptions through `claim-deal` with `redeemed_via = 'scanner'` set `redemption_metered = true`
- `restaurant_billing_usage.billable_redemptions` increments per scanner redeem
- First **30** billable redemptions/month are free on `subscription_plus_metering`
- Overage: **$0.50** per redemption after 30
- `check_restaurant_integrity(restaurant_id)` flags low scan-to-claim ratio (possible off-platform honoring)

## Verification

```sql
select id, name, restaurant_tier, billing_mode, trial_ends_at,
       stripe_subscription_id, subscription_expires_at
from public.restaurants
where id = '<restaurant_id>';

select * from public.restaurant_billing_usage
where restaurant_id = '<restaurant_id>'
order by month_key desc;
```
