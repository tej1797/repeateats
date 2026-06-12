# RepEAT — Project Memory for Claude Code

## What This Project Is
Restaurant deals marketplace for Ontario, Canada.
Live at: https://repeateats.ca
GitHub: https://github.com/tej1797/repeateats
Owner: Tejas Khatri (tejaskhatri007@gmail.com)

## Three Portals
- `/customer` — browse and claim restaurant deals (all signed-in users)
- `/restaurant` — restaurant owners post deals, manage profile
- `/influencer` — creators find collabs, earn from restaurants

## Tech Stack
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Hosting:** Vercel (auto-deploy from GitHub main branch)
- **Payments:** Stripe (planned, not yet implemented)
- **Domain:** repeateats.ca (Porkbun DNS → Vercel)

## Key File Locations
- `src/app/page.tsx` — landing page
- `src/app/restaurant/page.tsx` — restaurant portal (auth + 5-step onboarding wizard + dashboard)
- `src/app/influencer/page.tsx` — influencer portal (auth + collab feed + negotiate modal + chat)
- `src/app/customer/page.tsx` — customer portal (deal feed + claim QR + auth modal)
- `src/app/customer/login/page.tsx` — customer login page
- `src/app/customer/signup/page.tsx` — customer 3-step signup
- `src/app/influencer/signup/page.tsx` — creator 3-step onboarding
- `src/app/influencer/profile/page.tsx` — creator profile + earnings + recharts
- `src/app/auth/callback/route.ts` — OAuth callback, reads rp_portal cookie → redirects
- `src/app/api/auth/set-portal/route.ts` — sets rp_portal cookie before OAuth
- `src/middleware.ts` — session refresh ONLY, no redirects
- `src/lib/supabase/client.ts` — browser Supabase client
- `src/lib/supabase/server.ts` — server Supabase client
- `src/types/index.ts` — DB table interfaces
- `supabase/schema.sql` — run first in Supabase SQL Editor
- `supabase/seed.sql` — run second (12 restaurants, 15 deals, 7 collabs)
- `SETUP.md` — full setup instructions

## Database Tables (Supabase)
- `users` — id, email, name, city, radius_km, role, portal
- `restaurants` — id, owner_id, name, cuisine, category, city, address, phone, website, hours (jsonb), is_live, rating, google_place_id, cover_url, open_to_collabs
- `deals` — id, restaurant_id, title, emoji, discount_type, discount_value, deal_types[], available_days[], scope, max_claims, current_claims, is_coming, is_active, valid_from, valid_until
- `claims` — id, deal_id, user_id, qr_code, status, redeemed_at
- `influencers` — id, user_id, display_name, avatar_url, instagram_handle, tiktok_handle, niche, follower_range, primary_platform, city, bio, avg_rating, etransfer_email, paypal_email, preferred_payment
- `collabs` — id, restaurant_id, influencer_id, offer_amount_min, offer_amount_max, creator_rate, status, deliverables, brief, deadline, draft_content_url, final_post_url, payment_deposited_at, payment_released_at, notes
- `messages` — id, collab_id, sender_id, text, created_at
- `notifications` — id, user_id, type, read, created_at

## API Routes
- `GET/POST /api/restaurants` — list with filters, create
- `GET/PATCH /api/restaurants/[id]` — detail + update
- `GET/POST /api/deals` — list with filters, create
- `GET/PATCH /api/deals/[id]` — detail + update
- `POST /api/claims` — claim a deal (returns QR code)
- `POST /api/claims/[qrCode]/redeem` — redeem at restaurant
- `GET/POST /api/collabs` — list open collabs, create
- `GET/PATCH /api/collabs/[id]` — detail + influencer apply
- `GET/POST /api/messages` — thread by collab_id, send
- `GET /api/google-places` — search restaurants; falls back to static Ontario DB if no API key
- `GET/PATCH /api/profile` — customer profile + claims
- `GET/PATCH /api/creator/profile` — influencer profile + collab stats + earnings

## Brand / Design
- **Orange:** `#E85D04` (brand), `#FF7A30` (hover)
- **Green (restaurant):** `#065F46`
- **Purple (influencer):** `#7E22CE`
- **Background:** `#F8F7F4` (light pages), `#0A0A0A` (dark auth pages)
- **Fonts:** Syne 700/800 (display/logo), Plus Jakarta Sans (body)
- **Logo:** "Rep" + "EAT" in orange

## Auth Flow (FINAL — client-side only, PKCE compatible)
1. User clicks "Continue with Google" on any portal
2. `localStorage.setItem('rp_portal', 'restaurant')` — survives redirect chain
3. `supabase.auth.signInWithOAuth({ provider: 'google' })` — no redirectTo needed
4. Google → Supabase → redirects to Site URL (repeateats.ca/?code=xxx)
5. Homepage `useEffect` detects `?code=` in `window.location.search`
6. Client-side: `supabase.auth.exchangeCodeForSession(code)` — PKCE verifier is on this domain
7. On success: reads `localStorage('rp_portal')`, clears it, cleans URL
8. `router.replace('/restaurant')` — navigates to correct portal
9. Portal `onAuthStateChange` fires `INITIAL_SESSION` / `SIGNED_IN` → shows content
10. For email/password: `signInWithPassword` → `onAuthStateChange` handles view transition

Why this works: PKCE verifier cookie is set by Supabase on repeateats.ca when OAuth starts.
Code exchange runs on repeateats.ca (homepage). Same domain = verifier always available.
localStorage is NOT affected by cross-site redirects. No server-side callback needed.

## Same-Email Multi-Portal (role-based)
One Supabase user can be a customer AND restaurant owner AND influencer with the same email.
- **Restaurant portal:** checks `restaurants.owner_id = user.id` → dashboard if found, onboarding if not
- **Influencer portal:** checks `influencers.user_id = user.id` → feed if found, onboarding if not
- **Customer portal:** always shows deal feed (everyone is a customer)

## Middleware
Session refresh ONLY — no redirects anywhere. Each portal handles its own auth state.

## Portal Auth Pattern (use this for ALL portals)
```tsx
useEffect(() => {
  let mounted = true;
  const init = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession(); // fast, no network
      if (!mounted) return;
      if (!session?.user) { setView('login'); return; }
      // ... check DB for user's rows
    } catch (err) {
      console.error('init error:', err);
      if (mounted) setView('login');
    }
  };
  void init();
  const timeout = setTimeout(() => {
    if (mounted) setView(v => v === 'loading' ? 'login' : v);
  }, 5000); // safety fallback
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    // handle SIGNED_IN / SIGNED_OUT
  });
  return () => { mounted = false; clearTimeout(timeout); subscription.unsubscribe(); };
}, [supabase]);
```

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SITE_URL=https://repeateats.ca
GOOGLE_PLACES_API_KEY=AIza...  (optional — has static Ontario DB fallback)
```

## Adding Google Places API Key to Vercel
```bash
npx vercel login   # choose GitHub
npx vercel link
npx vercel env add GOOGLE_PLACES_API_KEY
npx vercel --prod
```

## Component Library
- `src/components/RepEATLogo.tsx` — logo with portal-specific stroke; props: `portal`, `size`, `onClick`
- `src/components/ReviewsSection.tsx` — Google reviews display
- `src/components/StarRating.tsx` — reusable star rating
- `src/app/api/verify-instagram/route.ts` — GET `?handle=` → `{ valid, full_name, followers }`

## Recent Fixes
- Email verification: both signup pages handle auto-confirm (`data.session` → direct redirect)
  and email-confirm (`!session` → verify-email page). Verify-email pages poll every 3s and
  auto-redirect when `email_confirmed_at` is set. Resend countdown reduced to 30s.
- Instagram verification: `/api/verify-instagram` fetches public IG page; influencer signup shows
  live status (checking / valid / invalid / unknown) as user types handle (800ms debounce).
- RepEATLogo component: portal-specific `-webkit-text-stroke` so "Rep" is visible on white cards.
- Session persistence: `persistSession:true`, `autoRefreshToken:true`, `storageKey:'repeateats-auth'`
- Logo navigation: customer → /customer, restaurant dashboard → /restaurant, influencer → /influencer
- Header height: all three portal headers standardized to 64px (h-16)

## Known Issues & Status
- [x] Google OAuth always redirecting to /customer — FIXED (rp_portal localStorage)
- [x] Restaurant page infinite spinner — FIXED (getSession() + 5s timeout)
- [x] Homepage flash after OAuth — FIXED (middleware no-redirect)
- [x] Same-email multi-portal confusion — FIXED (role determined by DB rows)
- [x] Verification email flow — FIXED (auto-confirm + polling + 30s countdown)
- [x] Instagram verification — FIXED (/api/verify-instagram route)
- [x] Session persistence — FIXED (persistSession + autoRefreshToken + storageKey)
- [x] Logo navigation — FIXED (portals link to themselves, not homepage)
- [x] Restaurant publish error "Cannot read properties of id" — FIXED (fresh getUser + dual key parse)
- [x] "Already claimed" 409 errors — FIXED (show "View QR Code" button if already claimed)
- [x] Google Places test returning no results — FIXED (API returns both `data` and `results` keys)
- [x] Google OAuth "sign-in failed" after apex→www domain change — FIXED in code
      (Vercel 307s repeateats.ca → www.repeateats.ca; PKCE verifier cookie was host-only,
      so the callback on www couldn't exchange the code. Supabase auth cookies + rp_portal
      cookie now use domain=.repeateats.ca so they survive the hop.)
      NOTE: canonical host is now www.repeateats.ca — Supabase Site URL and
      NEXT_PUBLIC_SITE_URL should be https://www.repeateats.ca (or make apex primary in Vercel).
- [ ] Google Places API key not set in Vercel production env (use static Ontario DB fallback for now)
- [ ] QR codes are scannable via `react-qrcode-logo` — already implemented in QrModal
- [ ] Stripe payments not implemented
- [ ] Push notifications not implemented
- [ ] RepEAT+ subscription page exists but not functional

## V2 Architecture
- Design system: `src/lib/constants.ts` — BRAND, CUISINES, ONTARIO_CITIES
- Utility functions: `src/lib/utils.ts` — formatCurrency, generateQRCode, etc.
- Database types: `src/types/database.ts` — raw DB row shapes (UserRow, RestaurantRow, etc.)
- UI types: `src/types/index.ts` — enriched/joined shapes used in components
- Shared components: `src/components/`
- Portal-specific: `src/app/{portal}/`
- API routes: `src/app/api/`
- Hooks: `src/hooks/`
- Smoke tests: `src/tests/smoke-test.ts`

## Cross-Platform Notes
- Mobile app (React Native + Expo) will share the same Supabase project
- ALL database changes must be backward compatible
- API routes serve both web and mobile
- Auth works across platforms (same JWT, same Supabase project)
- Realtime events shared between web and mobile

## Dev Commands
```bash
npm run dev      # start dev server → localhost:3000
npm run build    # production build (must be 0 errors before deploy)
npx tsx src/tests/smoke-test.ts  # run smoke tests against production
git push origin main  # auto-deploys to Vercel
```
