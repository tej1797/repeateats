# RepEAT Design System — Cross-Platform

This document defines the shared design language for
BOTH the website (Next.js) and mobile app (React Native).
Both platforms MUST follow these specs exactly.

## Brand Identity
- Name: RepEAT
- Logo: "Rep" + "EAT" (EAT in brand orange)
- Logo font: Syne, weight 800
- Tagline: "Restaurant deals, claimed in person."

## Color Palette

### Primary
- Brand Orange: #E85D04
- Brand Light: #FF9A4D
- Brand Dark: #A03C01
- Brand BG: #FFF3EC

### Portal Colors
- Customer: #E85D04 (orange)
- Restaurant: #065F46 (green)
- Creator: #7E22CE (purple)

### Dark Theme (PRIMARY — both platforms use dark)
- Background: #0A0A0A
- Surface 1: #141414
- Surface 2: #1E1E1E
- Surface 3: #262626
- Border: rgba(255,255,255,0.08)
- Text Primary: #F2F2F2
- Text Secondary: #999999
- Text Muted: #666666

### Semantic
- Success: #065F46
- Warning: #F59E0B
- Error: #DC2626
- Info: #3B82F6

## Typography

### Fonts
- Headings: Syne (web) / System bold (mobile)
- Body: Plus Jakarta Sans (web) / System (mobile)

### Scale
- H1: 36px / bold / -2px tracking
- H2: 28px / bold / -1px tracking
- H3: 22px / semibold
- H4: 18px / semibold
- Body: 15px / regular / 1.6 line-height
- Small: 13px / regular
- Caption: 11px / medium / uppercase tracking

## Spacing
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 48px

## Border Radius
- sm: 8px
- md: 12px
- lg: 16px
- card: 14px
- pill: 100px
- full: 9999px

## Components (both platforms)

### Deal Cards
- Image: 150px height, cover, rounded top
- Dark gradient overlay on image (bottom 40%)
- Restaurant name: 13px, semi-transparent pill bg
- Discount: Syne font, bold, orange
- Type badge: top-left on image
- Rating: gold stars, small
- Progress bar: orange fill
- Hover/press: slight lift

### Buttons
- Primary: orange bg, white text, 44px height
- Secondary: transparent, border, 44px height
- Danger: red bg, white text
- Border-radius: 10px
- Loading: spinner replaces text

### Inputs
- Height: 48px
- Background: surface-2
- Border: 1px solid border color
- Focus: brand orange border
- Error: red border + message below
- Text color: white (dark theme)
- Placeholder: text-muted

### Modals
- Background: surface-1
- Border: 1px solid border
- Rounded: 16px
- Backdrop: rgba(0,0,0,0.6)

## Navigation

### Customer Portal
- Tab bar (bottom on mobile, top on web):
  Deals | Search | Claims | Profile

### Restaurant Portal
- Sidebar (web) / Tab bar (mobile):
  Dashboard | Deals | Analytics | Profile | Settings

### Creator Portal
- Tab bar (bottom on mobile, top on web):
  Collabs | Chat | Earnings | Profile

## Auth Flow (shared)
- Google OAuth via Supabase
- Email/password via Supabase
- Same user can access all 3 portals
- Session persists across app restarts
- 7-day JWT expiry

## API Layer (shared Supabase)
- All data flows through same Supabase project
- Same tables, same RLS policies
- Same realtime subscriptions
- QR codes work cross-platform

## Screen Mapping (web <-> mobile)

| Feature | Web Route | Mobile Screen |
|---------|-----------|---------------|
| Landing | / | Onboarding |
| Customer Feed | /customer | CustomerHome |
| Deal Detail | /customer (modal) | DealDetail |
| Restaurant Page | /customer/restaurant/[id] | RestaurantDetail |
| Claim QR | /customer (modal) | ClaimQR |
| Profile | /customer/profile | CustomerProfile |
| Restaurant Login | /restaurant | RestaurantAuth |
| Restaurant Dashboard | /restaurant | RestaurantHome |
| Create Deal | /restaurant (modal) | CreateDeal |
| Creator Login | /influencer | CreatorAuth |
| Creator Feed | /influencer | CreatorHome |
| Chat | /influencer (modal) | Chat |
