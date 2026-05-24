-- ============================================================
-- RepEAT Database Schema
-- Run this entire file in Supabase Dashboard → SQL Editor
-- ============================================================

-- ─── 1. Users ───────────────────────────────────────────────
-- Extends Supabase's built-in auth.users table.
-- Supabase handles password hashing/sessions in auth.users;
-- we store app-specific fields here in public.users.
create table public.users (
  id         uuid references auth.users(id) on delete cascade primary key,
  email      text not null,
  name       text,
  city       text    default 'GTA Area',
  radius_km  integer default 30,
  -- role controls which portal the user sees
  role       text    default 'customer', -- customer | restaurant_owner | influencer
  created_at timestamptz default now()
);

-- ─── 2. Restaurants ─────────────────────────────────────────
create table public.restaurants (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.users(id) on delete set null,
  name             text    not null,
  cuisine          text,
  category         text,    -- maps to the emoji category in the feed (indian, bbq, etc.)
  city             text    not null,
  address          text,
  lat              numeric,
  lng              numeric,
  phone            text,
  website          text,
  instagram        text,
  hours            jsonb,   -- e.g. {"mon": "11AM-10PM", "tue": "closed", ...}
  logo_url         text,
  cover_url        text,
  description      text,
  is_live          boolean default false,
  accepts_dine_in  boolean default true,
  accepts_pickup   boolean default true,
  accepts_delivery boolean default false,
  open_to_collabs  boolean default false,
  rating           numeric default 0,
  review_count     integer default 0,
  created_at       timestamptz default now()
);

-- ─── 3. Deals ───────────────────────────────────────────────
create table public.deals (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid references public.restaurants(id) on delete cascade,
  title           text    not null,
  description     text,
  discount_type   text,    -- percentage | fixed | free_item | bogo | set_price
  discount_value  text,    -- "20%" or "$10" or "Buy 2 Get 1" etc.
  deal_types      text[]  default array['dine-in'], -- dine-in | pickup | delivery | catering
  available_days  text[]  default array['all'],     -- all | Mon | Tue ... or Mon-Fri
  scope           text    default 'single',          -- single | category | menu | bundle
  scope_detail    text,    -- the dish name, category name, or bundle description
  emoji           text    default '🍽️',
  photo_url       text,
  valid_from      date,
  valid_until     date,
  max_claims      integer,
  current_claims  integer default 0,
  is_coming       boolean default false,  -- true = "Coming Next Week" tab
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- ─── 4. Claims ──────────────────────────────────────────────
create table public.claims (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references public.deals(id) on delete cascade,
  user_id     uuid references public.users(id) on delete cascade,
  qr_code     text unique not null,  -- e.g. "RE-4A7X2B" — shown at the restaurant
  status      text default 'claimed', -- claimed | redeemed | expired
  claimed_at  timestamptz default now(),
  redeemed_at timestamptz
);

-- ─── 5. Influencers ─────────────────────────────────────────
create table public.influencers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references public.users(id) on delete cascade,
  instagram_handle   text,
  tiktok_handle      text,
  follower_count     integer,
  niche              text,   -- food | lifestyle | family | etc.
  bio                text,
  sample_content_url text,
  rating             numeric default 0,
  total_collabs      integer default 0,
  created_at         timestamptz default now()
);

-- ─── 6. Collabs ─────────────────────────────────────────────
create table public.collabs (
  id                uuid primary key default gen_random_uuid(),
  restaurant_id     uuid references public.restaurants(id) on delete cascade,
  influencer_id     uuid references public.influencers(id) on delete set null,
  offer_amount_min  integer,  -- in CAD dollars
  offer_amount_max  integer,
  deliverables      text,     -- "1 Reel + 3 Stories"
  requirements      text,     -- "8K–25K followers"
  brief             text,     -- what the restaurant wants
  status            text    default 'open', -- open | negotiating | accepted | completed | cancelled
  content_url       text,     -- link to the posted content
  payment_status    text    default 'pending', -- pending | escrowed | released
  stripe_payment_id text,
  created_at        timestamptz default now()
);

-- ─── 7. Messages ────────────────────────────────────────────
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  collab_id  uuid references public.collabs(id) on delete cascade,
  sender_id  uuid references public.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz default now()
);

-- ─── 8. Notifications ───────────────────────────────────────
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.users(id) on delete cascade,
  title      text,
  body       text,
  type       text,    -- deal_live | claim_confirmed | collab_request | message
  read       boolean default false,
  created_at timestamptz default now()
);


-- ============================================================
-- INDEXES
-- These speed up the most common queries (filtering by city,
-- looking up deals for a restaurant, etc.)
-- ============================================================

create index idx_restaurants_city       on public.restaurants(city);
create index idx_restaurants_is_live    on public.restaurants(is_live);
create index idx_restaurants_owner_id   on public.restaurants(owner_id);
create index idx_restaurants_category   on public.restaurants(category);

create index idx_deals_restaurant_id    on public.deals(restaurant_id);
create index idx_deals_is_active        on public.deals(is_active);
create index idx_deals_is_coming        on public.deals(is_coming);
create index idx_deals_valid_from       on public.deals(valid_from);
create index idx_deals_valid_until      on public.deals(valid_until);

create index idx_claims_deal_id         on public.claims(deal_id);
create index idx_claims_user_id         on public.claims(user_id);
create index idx_claims_qr_code         on public.claims(qr_code);

create index idx_collabs_restaurant_id  on public.collabs(restaurant_id);
create index idx_collabs_influencer_id  on public.collabs(influencer_id);
create index idx_collabs_status         on public.collabs(status);

create index idx_messages_collab_id     on public.messages(collab_id);

create index idx_notifications_user_id  on public.notifications(user_id);
create index idx_notifications_read     on public.notifications(read);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Think of RLS as per-row WHERE clauses that Postgres enforces
-- automatically on every query. auth.uid() returns the UUID of
-- the currently signed-in Supabase user.
-- ============================================================

alter table public.users          enable row level security;
alter table public.restaurants    enable row level security;
alter table public.deals          enable row level security;
alter table public.claims         enable row level security;
alter table public.influencers    enable row level security;
alter table public.collabs        enable row level security;
alter table public.messages       enable row level security;
alter table public.notifications  enable row level security;


-- ─── users policies ─────────────────────────────────────────
-- Users can only read/update their own row.
create policy "users: read own"
  on public.users for select
  using (auth.uid() = id);

create policy "users: update own"
  on public.users for update
  using (auth.uid() = id);

-- Supabase calls this on sign-up (via trigger below)
create policy "users: insert own"
  on public.users for insert
  with check (auth.uid() = id);


-- ─── restaurants policies ────────────────────────────────────
-- Anyone (including anonymous) can browse live restaurants.
create policy "restaurants: public read live"
  on public.restaurants for select
  using (is_live = true or owner_id = auth.uid());

-- Only authenticated users can create a restaurant.
create policy "restaurants: owner insert"
  on public.restaurants for insert
  with check (auth.uid() = owner_id);

-- Only the owner can update or delete their restaurant.
create policy "restaurants: owner update"
  on public.restaurants for update
  using (owner_id = auth.uid());

create policy "restaurants: owner delete"
  on public.restaurants for delete
  using (owner_id = auth.uid());


-- ─── deals policies ─────────────────────────────────────────
-- Anyone can read active deals (for the public feed).
create policy "deals: public read active"
  on public.deals for select
  using (
    is_active = true
    or exists (
      select 1 from public.restaurants r
      where r.id = deals.restaurant_id and r.owner_id = auth.uid()
    )
  );

-- Only restaurant owners can create/edit/delete their own deals.
create policy "deals: owner insert"
  on public.deals for insert
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "deals: owner update"
  on public.deals for update
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = deals.restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "deals: owner delete"
  on public.deals for delete
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = deals.restaurant_id and r.owner_id = auth.uid()
    )
  );


-- ─── claims policies ────────────────────────────────────────
-- Users can only see their own claims.
create policy "claims: read own"
  on public.claims for select
  using (user_id = auth.uid());

-- Any authenticated user can create a claim.
create policy "claims: insert authenticated"
  on public.claims for insert
  with check (auth.uid() = user_id);

-- Restaurant owners can update (redeem) claims for their deals.
create policy "claims: owner redeem"
  on public.claims for update
  using (
    exists (
      select 1 from public.deals d
      join public.restaurants r on r.id = d.restaurant_id
      where d.id = claims.deal_id and r.owner_id = auth.uid()
    )
  );


-- ─── influencers policies ───────────────────────────────────
-- Anyone can browse influencer profiles.
create policy "influencers: public read"
  on public.influencers for select
  using (true);

create policy "influencers: insert own"
  on public.influencers for insert
  with check (auth.uid() = user_id);

create policy "influencers: update own"
  on public.influencers for update
  using (auth.uid() = user_id);


-- ─── collabs policies ───────────────────────────────────────
-- Open collabs are public; participants can see their own private collabs.
create policy "collabs: public read open"
  on public.collabs for select
  using (
    status = 'open'
    or exists (
      select 1 from public.restaurants r
      where r.id = collabs.restaurant_id and r.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.influencers i
      where i.id = collabs.influencer_id and i.user_id = auth.uid()
    )
  );

create policy "collabs: restaurant owner insert"
  on public.collabs for insert
  with check (
    exists (
      select 1 from public.restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "collabs: participants update"
  on public.collabs for update
  using (
    exists (
      select 1 from public.restaurants r
      where r.id = collabs.restaurant_id and r.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.influencers i
      where i.id = collabs.influencer_id and i.user_id = auth.uid()
    )
  );


-- ─── messages policies ──────────────────────────────────────
-- Only the two parties in a collab can see/send messages.
create policy "messages: participants read"
  on public.messages for select
  using (
    exists (
      select 1 from public.collabs c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = messages.collab_id and r.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.collabs c
      join public.influencers i on i.id = c.influencer_id
      where c.id = messages.collab_id and i.user_id = auth.uid()
    )
  );

create policy "messages: participants insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and (
      exists (
        select 1 from public.collabs c
        join public.restaurants r on r.id = c.restaurant_id
        where c.id = collab_id and r.owner_id = auth.uid()
      )
      or exists (
        select 1 from public.collabs c
        join public.influencers i on i.id = c.influencer_id
        where c.id = collab_id and i.user_id = auth.uid()
      )
    )
  );


-- ─── notifications policies ─────────────────────────────────
create policy "notifications: read own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications: update own"
  on public.notifications for update
  using (user_id = auth.uid());


-- ============================================================
-- AUTO-CREATE USER ROW ON SIGN-UP
-- When someone signs up through Supabase Auth, this trigger
-- automatically inserts a row into public.users.
-- (In Python terms: this is like a post-save signal.)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
