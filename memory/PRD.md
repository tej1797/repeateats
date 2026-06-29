# RepEAT — Homepage Redesign PRD

## Problem Statement
Redesign ONLY the public homepage (`/`) of the existing RepEAT app (repeateats.ca) to premium
SaaS quality (Influish/Linear/Stripe inspired), keeping the dark + orange brand. Do NOT modify
backend, APIs, auth, portals, or any other route. Influish-style 3-portal boxes (Customer=orange,
Restaurant=blue, Creator=purple). Floating food/restaurant/creator cutouts in hero (no glass cards).

## Tech Stack (existing, preserved)
- Next.js 14.2.35 App Router, React 18, TypeScript, Tailwind 3.4.1
- Supabase backend (untouched). Fonts: Syne + Plus Jakarta Sans. Icons: @tabler/icons-react.
- Added libs: framer-motion ^12, lenis ^1.3 (smooth scroll).

## What's Been Implemented (2026-06-29)
- Full homepage rebuild at `src/app/page.tsx` (OAuth code-exchange useEffect + city search handler
  preserved exactly — navigates to `/customer/preview?city=`).
- New presentational components in `src/components/home/`:
  Nav, Hero, FloatingCutouts, LenisProvider, Reveal, Counter, PortalCards, LiveTicker,
  LogoMarquee, HowItWorks, FeaturedDeals, Benefits, Stats, Testimonials, FAQ, FinalCTA, SiteFooter,
  homeData.ts.
- Sections: Hero (animated headline, search, floating cutouts, mouse parallax) → Live ticker →
  3 Portal boxes (orange/blue/purple) → Logo marquee → How it works → Featured deals →
  Benefits → Animated stats → Testimonials → FAQ accordion → Final CTA → Footer.
- Hero cutout assets (true-transparent PNGs, bg removed via rembg) in `public/home/`:
  burger, pizza, bubbletea, restaurant, creator. Optimized via next/image.
- Motion respects prefers-reduced-motion (Lenis + counters skip).
- Verified: renders all sections, search navigates correctly, portal links
  (/customer/preview, /restaurant, /influencer) correct, FAQ toggles, responsive (mobile hamburger,
  stacked cards, cutouts hidden < sm). No compile errors.

## Environment Notes
- App runs via supervisor program `nextapp` (`npm run dev` on :3000) since repo is Next.js at /app
  root (not /app/frontend). `/app/.env.local` holds PLACEHOLDER Supabase keys for local preview only
  (gitignored via `.env*`). Real keys live in Vercel.

## Backlog / Next Actions
- Optional: add Lenis-driven section parallax, real restaurant logos/testimonials when available.
- Optional: hook stats to live Supabase counts instead of placeholders.
- Run `npm run build` with real env before Vercel deploy to confirm production build.
