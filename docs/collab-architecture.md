# Restaurant ↔ Creator Collabs — Architecture (design, pre-build)

How the restaurant and creator portals should connect for paid collaborations.
Reference model: Influish (brand ↔ creator marketplace — brands post campaigns,
many verified creators apply, brand reviews & hires, content is submitted &
approved, payment is released; 0% creator commission). RepEAT's twist: it's
restaurant-specific and money flows through RepEAT escrow (2% platform fee).

---

## 1. Why your test failed (current bugs)

You applied as a creator but the restaurant saw nothing, and your username
didn't populate. Three distinct root causes:

1. **There is no "applications" concept in the data model.** `collabs` is a
   SINGLE row with ONE `influencer_id`. "Apply" (`NegotiateModal.handleApply`)
   does `PATCH /api/collabs/[id] { influencer_id, status:'negotiating' }` — it
   *overwrites the posting itself*. So:
   - Only one creator can ever be attached to a posting (last applicant wins).
   - There's no list of applicants for the restaurant to review.
2. **You applied to a different restaurant's posting.** The creator feed shows
   ALL open collabs (incl. the 7 seeded ones). The posting you applied to is
   owned by a *seeded* restaurant, not your logged-in restaurant — whose own
   collab list (`collabs WHERE restaurant_id = mine`) is therefore empty.
3. **Username doesn't populate** because applying auto-creates a *bare*
   `influencers` row (`{ user_id, rating:0, total_collabs:0 }` in
   `/api/collabs/[id]`) with no `instagram_handle`. Also there is **no
   `display_name` column** on `influencers` at all (the help page references one
   that doesn't exist). So the restaurant has nothing to show + no date/handle.

Net: the marketplace layer (postings → many applications → hire → contract)
doesn't exist yet. The escrow/contract half is built; the discovery+apply half
is missing.

---

## 2. Target data model

Split the single `collabs` table's two jobs (the *posting* and the *contract*)
and add the missing *application* layer.

### `collabs` = the POSTING (campaign)
Restaurant's opportunity. `influencer_id` stays NULL while open.
- restaurant_id, title, brief, deliverables, requirements
- budget: offer_amount_min / offer_amount_max
- status: `draft` → `open` → `filled` / `closed` / `expired`
- deadline, created_at
- (keep the existing escrow/contract fields for the hired creator — see below)

### `collab_applications` = NEW TABLE (the missing piece)
One row per creator who applies. Many per posting.
- id, posting_id (→ collabs.id), influencer_id (→ influencers.id)
- proposed_amount (their counter-offer), pitch (intro message)
- status: `pending` → `shortlisted` → `accepted` / `declined` / `withdrawn`
- created_at, updated_at
- **UNIQUE(posting_id, influencer_id)** — one application per creator per posting
- RLS: creator sees their own; restaurant owner sees applications to their postings

### The CONTRACT (hired creator)
When the restaurant **accepts** an application, the posting becomes the contract:
set `collabs.influencer_id`, `agreed_amount`, `status='accepted'`, and decline
the other applications. (v1 = one hire per posting. Escrow fields already exist
on `collabs`: agreed_amount, platform_fee_cents, stripe_payment_intent_id,
stripe_transfer_id, funded_at, released_at.)

### `messages` = chat thread
Currently keyed by `collab_id`. Re-key to **`application_id`** so negotiation
chat is per-creator (today every applicant would share one thread). After hire,
the accepted application's thread continues as the working thread.

### `influencers` — identity fixes
- Add `display_name` (referenced but missing).
- Populate `instagram_handle` / `display_name` at **signup** (and from the
  IG-verification flow), not a bare row at apply-time.
- Backfill: never auto-create a blank influencer; require a creator profile
  before applying (or create it WITH the known handle/name).

---

## 3. Lifecycle state machine

```
POSTING (collabs.status):
  draft → open → filled → completed
                 ↘ closed / expired

APPLICATION (collab_applications.status):
  pending → shortlisted → accepted → (becomes the contract)
        ↘ declined        ↘ withdrawn (creator pulls out)

CONTRACT (collabs.status after accept):
  accepted → funded(escrow) → in_progress → draft_submitted
           → approved (or auto-approve 48h) → posted → released → completed
           ↘ disputed / cancelled (refund path)
```

This matches the "HOW THIS COLLAB WORKS" steps already shown in your screenshot
(deposit → create → submit draft → approve 48h → post → release minus 2%). Those
6 steps ARE the contract lifecycle — they just need the application stage in
front of them.

---

## 4. Two-sided UX flows

### Restaurant
1. **Create posting** (campaign): title, brief, deliverables, budget range,
   deadline. (Gated by plan tier — Starter: collabs; Pro: unlimited.)
2. **Applications inbox** (the filter you were looking for): list of creators who
   applied to each posting — handle, avatar, followers, niche, rating, proposed
   amount, pitch, **date applied**. Filter by posting / status.
3. **Review** a creator → open their profile + chat thread → shortlist / decline
   / **accept** (hire). Accepting sets the contract + declines the rest.
4. **Fund escrow** → review draft → approve → **release** (existing escrow flow).

### Creator
1. **Complete profile** (handle, niche, followers, samples, payout setup) — this
   is what populates the username everywhere.
2. **Browse postings** (feed, filters by cuisine/city/budget).
3. **Apply** with a proposed amount + pitch → creates an application (status
   pending), opens chat. Can apply to many; can withdraw.
4. **Track** applications (pending / shortlisted / accepted / declined).
5. After hire: create content → submit draft → post link → get paid (escrow
   release minus 2%).

---

## 5. Supporting systems

- **Notifications** (table exists): creator applied → notify restaurant; accepted/
  declined → notify creator; draft submitted → notify restaurant; approved/funds
  released → notify creator. Plus the email toggles already in Settings
  ("Collab requests" email).
- **Realtime**: applications inbox + chat should live-update (Supabase Realtime,
  like the customer claim feed already does).
- **Verified creators** (Influish parity): IG verification already exists
  (`/api/verify-instagram`); surface a "verified" badge + follower count so
  restaurants trust applicants.
- **Discovery/matching** (later): restaurant can also browse creators and invite
  them (reverse direction) — an `invitations` flavor of application.
- **Anti-circumvention**: keep money in escrow; same spirit as the deals policy.

---

## 6. What's already built vs missing

**Built:** escrow (fund/release, 2% fee, Connect payouts), per-collab chat,
creator feed of open collabs, the "how it works" explainer, IG verification,
notifications table, email toggles.

**Missing (the gap):**
1. `collab_applications` table + RLS (the core missing layer).
2. Apply = create an application (not overwrite the posting).
3. Restaurant **Applications inbox** UI (web has none; this is the "filter" you
   couldn't find — it may exist only on mobile).
4. Accept-application → contract transition (set influencer_id + decline others).
5. Creator profile completeness + `display_name`; stop auto-creating blank rows;
   populate handle/name at signup.
6. Re-key chat to application_id.
7. Notifications wired for the apply/accept/submit events.
8. Plan-tier gating on posting creation + applications (Free = view-only).

---

## 7. Phased build plan

- **Phase 1 — Make apply visible (unblocks your test):** add
  `collab_applications` + RLS; change creator apply to insert an application;
  build the restaurant Applications inbox (handle, followers, proposed amount,
  pitch, date) with accept/decline; notify on apply.
- **Phase 2 — Hire → contract:** accept transitions the posting to a contract
  (set influencer_id/agreed_amount, decline others), then the existing escrow
  flow takes over. Re-key chat to application_id.
- **Phase 3 — Identity & trust:** `display_name`, signup populates handle, verified
  badge + follower count, creator profile page the restaurant can view.
- **Phase 4 — Discovery & polish:** restaurant browses/invites creators,
  realtime inboxes, richer filters/matching, analytics, plan-tier gating.

---

## 8. Open product decisions (need Tejas's call before building)

1. **One hire per posting, or several?** (v1 recommend one; multi-slot later.)
2. **Negotiation:** fixed budget the creator accepts, or open counter-offer
   haggling in chat? (Current UI implies counter-offers.)
3. **Who initiates?** Creators-apply-only for v1, or also restaurant-invites?
4. **Free/Starter/Pro gating** for collabs (Free = view-only per the plans spec;
   confirm Starter limit vs Pro unlimited).
5. **Auto-approve window** (screenshot says 48h) — keep?
6. **Platform fee** stays 2%? (Influish is 0% to creators — do we match or keep 2%?)

---

## 9. Coordination note (web ↔ mobile)
The escrow + collab schema is shared. The Applications inbox the user expected
may already be partially built on mobile — confirm with the mobile session what
exists (any `collab_applications` table? apply flow? inbox UI?) BEFORE building,
so we add ONE applications layer both platforms share (same pattern as PINs,
payment methods, and the billing engine).
