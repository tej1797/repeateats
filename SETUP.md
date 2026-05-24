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
