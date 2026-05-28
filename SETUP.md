# RepEAT — Backend Setup Guide

Complete setup from scratch, step by step.

---

## 1. Run the Database Schema

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project → **SQL Editor** (left sidebar)
3. Click **New query**
4. Copy the entire contents of `supabase/schema.sql` and paste it in
5. Click **Run** (or press Cmd+Enter)

You should see "Success. No rows returned." for each statement.

**What this creates:**
- 8 tables: users, restaurants, deals, claims, influencers, collabs, messages, notifications
- Indexes for fast filtering
- Row Level Security policies (controls who can see/edit what)
- A trigger that auto-creates a `public.users` row whenever someone signs up

---

## 2. Run the Seed Data

1. In Supabase → SQL Editor → New query
2. Copy the entire contents of `supabase/seed.sql` and paste it in
3. Click **Run**

This inserts:
- 12 Ontario restaurants (7 GTA, 5 KW)
- 15 deals across those restaurants
- 7 open collab listings

**Important:** The seed restaurants have `owner_id = NULL` because auth users
can't be created via SQL. To claim ownership:
1. Sign up in the app as a restaurant owner
2. Go to Supabase → **Authentication** → find your user → copy the UUID
3. Run this in SQL Editor:
   ```sql
   UPDATE public.restaurants
   SET owner_id = 'paste-your-uuid-here'
   WHERE name = 'Karahi Boys';  -- repeat for each restaurant you own
   ```

---

## 3. Enable Realtime on the Messages Table

Supabase Realtime (used by `useMessages` hook for live chat) requires
the table to be added to the Realtime publication.

1. Supabase Dashboard → **Database** → **Replication** (left sidebar)
2. Under **Supabase Realtime**, click the toggle next to `public.messages`
   to enable it

OR run this in the SQL Editor:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
```

---

## 4. Set Up Google Places API Key

The `/api/google-places` route auto-fills restaurant info during onboarding.

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Enable these APIs:
   - **Places API**
   - **Maps JavaScript API** (for future map view)
4. Create an API key: **APIs & Services → Credentials → Create Credentials → API Key**
5. Restrict the key to your domain in production
6. Add to `.env.local`:
   ```
   GOOGLE_PLACES_API_KEY=AIza...your_key_here
   ```

The key is server-only (no `NEXT_PUBLIC_` prefix) — it never reaches the browser.

**Note:** The search works without an API key — it falls back to a built-in Ontario restaurant
database. Add the key only when you need live Google Maps data.

### Adding the Key to Vercel (CLI method)

If the Vercel dashboard login is giving trouble, use the CLI instead:

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login (choose GitHub)
npx vercel login

# 3. Link this project
npx vercel link

# 4. Add the environment variable (paste key when prompted, select all environments)
npx vercel env add GOOGLE_PLACES_API_KEY

# 5. Redeploy with the new env var
npx vercel --prod
```

---

## 5. Connect Your Supabase Project

Replace the placeholder values in `.env.local` with your real credentials:

1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...   ← keep this secret, never expose to browser
NEXT_PUBLIC_SITE_URL=https://repeateats.ca
```

---

## 6. Test Each API Route Locally

Start the dev server:
```bash
npm run dev
```

Then test each route with `curl` (or use Postman / browser):

### Restaurants
```bash
# List all live restaurants
curl http://localhost:3000/api/restaurants

# Filter by city
curl "http://localhost:3000/api/restaurants?city=Mississauga"

# Single restaurant with its deals
curl http://localhost:3000/api/restaurants/11111111-0001-0000-0000-000000000000
```

### Deals
```bash
# Active deals (default)
curl http://localhost:3000/api/deals

# Coming next week
curl "http://localhost:3000/api/deals?tab=coming"

# Filter: Indian food, dine-in, GTA
curl "http://localhost:3000/api/deals?category=indian&type=dine-in&city=Mississauga"
```

### Claims (requires auth — test via browser after signing in)
```bash
# Claim a deal (must be signed in)
curl -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -d '{"deal_id": "22222222-0001-0000-0000-000000000000"}'
  # → returns { data: { qr_code: "RE-XXXXXX", ... } }

# Redeem a QR code (restaurant staff)
curl -X POST http://localhost:3000/api/claims/RE-XXXXXX/redeem
```

### Collabs
```bash
# All open collabs
curl http://localhost:3000/api/collabs

# Filter by cuisine
curl "http://localhost:3000/api/collabs?cuisine=Indian"
```

### Messages
```bash
# Fetch messages for a collab (requires auth)
curl "http://localhost:3000/api/messages?collab_id=33333333-0001-0000-0000-000000000000"

# Send a message
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{"collab_id": "33333333-0001-0000-0000-000000000000", "text": "Hi, interested!"}'
```

### Google Places
```bash
# Search for a restaurant (requires GOOGLE_PLACES_API_KEY in .env.local)
curl "http://localhost:3000/api/google-places?query=Karahi+Boys+Mississauga"
```

---

## 7. Supabase Email Template (Verification)

Customise the sign-up verification email so it matches the RepEAT brand.

1. Supabase Dashboard → **Authentication** → **Email Templates**
2. Select **Confirm signup**
3. Set **Subject** to:
   ```
   Verify your RepEAT account 🍽️
   ```
4. Replace the **HTML body** with:

```html
<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:40px 24px;background:#0A0A0A;color:#F0F0F0;border-radius:16px;">
  <h1 style="font-size:36px;font-weight:800;letter-spacing:-2px;margin-bottom:8px;">
    Rep<span style="color:#E85D04">EAT</span>
  </h1>
  <p style="color:#AAA;margin-bottom:24px;font-size:16px;line-height:1.6;">
    You're one step away from saving big on local restaurant deals across Ontario 🇨🇦
  </p>
  <a href="{{ .ConfirmationURL }}"
    style="display:inline-block;background:#E85D04;color:white;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;text-decoration:none;">
    Verify my email →
  </a>
  <p style="color:#666;font-size:12px;margin-top:32px;line-height:1.6;">
    Didn't sign up? You can safely ignore this email.<br>
    <strong style="color:#E85D04">repeateats.ca</strong> · Ontario, Canada 🇨🇦
  </p>
</div>
```

5. Click **Save**

---

## 8. SQL: Creator & RLS Fixes

Run in Supabase **SQL Editor** after the initial schema:

```sql
-- Role-based portal column on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS portal text DEFAULT 'customer';

-- Fix collabs RLS — allow authenticated users to PATCH open collabs
ALTER TABLE public.collabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "collabs_update" ON public.collabs;
CREATE POLICY "collabs_update" ON public.collabs
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Fix messages RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "messages_select" ON public.messages;
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Creator payment + profile fields
ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS etransfer_email text,
  ADD COLUMN IF NOT EXISTS paypal_email text,
  ADD COLUMN IF NOT EXISTS bank_transit text,
  ADD COLUMN IF NOT EXISTS bank_institution text,
  ADD COLUMN IF NOT EXISTS bank_account_masked text,
  ADD COLUMN IF NOT EXISTS preferred_payment text DEFAULT 'etransfer',
  ADD COLUMN IF NOT EXISTS total_earned_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS escrow_balance_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_collabs integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS primary_platform text,
  ADD COLUMN IF NOT EXISTS follower_range text,
  ADD COLUMN IF NOT EXISTS avg_rating numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

-- Collab content submission fields
ALTER TABLE public.collabs
  ADD COLUMN IF NOT EXISTS draft_content_url text,
  ADD COLUMN IF NOT EXISTS final_post_url text,
  ADD COLUMN IF NOT EXISTS content_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS content_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_deposited_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS deadline timestamptz,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS creator_rate integer;
```

---

## 9. Supabase Auth Settings (Required)

In **Supabase Dashboard → Authentication → Settings**:

1. **Enable email confirmations** toggle → **ON**
   (If OFF, users are auto-confirmed and no email is sent — that's also fine for testing)

2. **JWT expiry** → set to `604800` (7 days)
   This keeps users logged in for 7 days of inactivity instead of the default 1 hour.

3. **Site URL** → `https://repeateats.ca`

4. **Redirect URLs** → add all of these:
   - `https://repeateats.ca/auth/callback`
   - `https://repeateats.ca/auth/callback/customer`
   - `https://repeateats.ca/auth/callback/restaurant`
   - `https://repeateats.ca/auth/callback/influencer`
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/callback/customer`
   - `http://localhost:3000/auth/callback/restaurant`
   - `http://localhost:3000/auth/callback/influencer`

For production Instagram verification, apply for:
**Meta for Developers → Instagram Basic Display API**
URL: developers.facebook.com/apps
Gives you: verified profile info, follower count, media count.

---

## Project Structure (after this setup)

```
repeateats/
├── supabase/
│   ├── schema.sql          ← Run first in Supabase SQL Editor
│   └── seed.sql            ← Run second
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── restaurants/     ← GET list, POST create
│   │   │   │   └── [id]/        ← GET detail, PATCH update
│   │   │   ├── deals/           ← GET list, POST create
│   │   │   │   └── [id]/        ← GET detail, PATCH update
│   │   │   ├── claims/          ← GET user claims, POST claim deal
│   │   │   │   └── [qrCode]/redeem/  ← POST redeem QR
│   │   │   ├── collabs/         ← GET list, POST create
│   │   │   │   └── [id]/        ← GET detail, PATCH update
│   │   │   ├── messages/        ← GET thread, POST send
│   │   │   └── google-places/   ← GET search proxy
│   │   ├── page.tsx             ← Landing page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── hooks/
│   │   ├── useDeals.ts
│   │   ├── useRestaurants.ts
│   │   ├── useClaims.ts
│   │   ├── useCollabs.ts
│   │   └── useMessages.ts
│   ├── lib/supabase/
│   │   ├── client.ts            ← Browser Supabase client
│   │   └── server.ts            ← Server Supabase client
│   └── types/
│       ├── index.ts             ← DB table interfaces
│       └── api.ts               ← Request/response types
└── .env.local                   ← Your secret keys (never commit this)
```
