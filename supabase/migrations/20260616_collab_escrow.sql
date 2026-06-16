-- Collab escrow marketplace (Stripe Connect)
-- Restaurant funds a finalized collab → funds held on the platform balance →
-- on release, the influencer's connected account receives the net amount and
-- RepEAT keeps a 2% platform fee.

-- ── Influencers: Stripe Connect (Express) account ──────────────────────────────
alter table public.influencers
  add column if not exists stripe_account_id text,
  add column if not exists stripe_onboarded  boolean not null default false,
  add column if not exists payouts_enabled   boolean not null default false;

-- ── Collabs: escrow tracking ───────────────────────────────────────────────────
-- payment_status flows: pending → escrowed → released  (already exists, default 'pending')
alter table public.collabs
  add column if not exists agreed_amount            integer,      -- final agreed price, in CAD dollars
  add column if not exists platform_fee_cents       integer,      -- RepEAT's 2% cut, in cents
  add column if not exists stripe_payment_intent_id text,         -- the charge that funded escrow
  add column if not exists stripe_transfer_id       text,         -- the transfer to the influencer
  add column if not exists funded_at                timestamptz,  -- when escrow was funded
  add column if not exists released_at              timestamptz;  -- when funds were disbursed

create index if not exists idx_collabs_payment_status on public.collabs(payment_status);
create index if not exists idx_influencers_stripe_account on public.influencers(stripe_account_id);
