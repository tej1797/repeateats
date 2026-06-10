# Website ↔ Mobile Stripe Sync (repeateats.ca)

The mobile app does **not** process payments directly. Checkout and subscription management run on the Next.js website; the mobile app opens Stripe in an in-app browser and polls `users.repeat_plus_tier` after success.

## Required website behaviour

### 1. Checkout API (`POST /api/stripe/checkout`)

Mobile sends:

```json
{
  "plan": "starter" | "pro" | "yearly",
  "billing_interval": "monthly" | "quarterly" | "yearly",
  "success_url": "repeateats://repeat-plus?status=success&plan=pro",
  "cancel_url": "repeateats://repeat-plus?status=cancel",
  "user_id": "<supabase-auth-uuid>"
}
```

`billing_interval` selects the Stripe price for 3-month and yearly Starter tiers. When omitted, treat as `monthly`.

Headers: `Authorization: Bearer <supabase-jwt>`

Must return `{ "url": "<stripe-checkout-url>" }`.

### 2. Stripe webhook (critical)

On `checkout.session.completed` and `customer.subscription.updated` / `deleted`, update the **shared** `users` row:

```sql
-- Example fields the mobile app reads
update public.users set
  repeat_plus_tier = 'starter',  -- or 'pro', 'yearly', 'free'
  repeat_plus_plan = 'starter',
  stripe_customer_id = 'cus_...',
  stripe_subscription_id = 'sub_...',
  repeat_plus_expires_at = '2026-07-06T00:00:00Z'
where id = '<user_id>';
```

| Stripe plan | `repeat_plus_tier` | Mobile limits |
|-------------|-------------------|---------------|
| Free / cancelled | `free` | 1/day, 3/month |
| Starter monthly | `starter` | 3/day, 20/month |
| Pro monthly | `pro` | 3/day, 30/month |
| Pro yearly | `yearly` | 3/day, 30/month |

The `claim-deal` edge function enforces these limits server-side using `repeat_plus_tier`.

### 3. Verification query

After a test checkout from mobile, run in Supabase SQL Editor:

```sql
select id, email, repeat_plus_tier, repeat_plus_plan, stripe_subscription_id
from public.users
where id = '<user_id>';
```

Tier should update within ~5 seconds of Stripe webhook delivery. Mobile polls for up to 5s on checkout success.

### 4. Customer portal (`POST /api/stripe/portal`)

Mobile sends `return_url: repeateats://profile`. Portal cancellations must set `repeat_plus_tier = 'free'`.

## Customer trial (mobile)

New signups get a **3-day Pro trial** via DB trigger (`repeat_plus_trial_*` columns).
While trial is active and `repeat_plus_tier = 'free'`, the mobile app grants Pro visibility + limits.

When Stripe checkout completes, set `repeat_plus_tier` to the paid plan. Do **not** reset `repeat_plus_trial_used` — it prevents re-trial.

## Checklist for website repo

- [ ] Webhook handler writes `repeat_plus_tier` (not legacy `is_repeat_plus` alone)
- [ ] Webhook respects `repeat_plus_trial_used` (no accidental trial reset on subscribe)
- [ ] Plan slug mapping: `starter`, `pro`, `yearly` match mobile `useRepeatPlus` Plan type
- [ ] `EXPO_PUBLIC_SITE_URL` / canonical host is `https://www.repeateats.ca` (avoids apex redirect stripping JWT)
- [ ] CORS allows mobile origin if checkout is called from Expo web preview
