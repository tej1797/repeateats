-- The missing "applications" layer: many creators can apply to one posting.
-- (Previously collabs held a single influencer_id, so applying overwrote the
--  posting and the restaurant had no list of applicants to review.)
create table if not exists public.collab_applications (
  id              uuid primary key default gen_random_uuid(),
  posting_id      uuid not null references public.collabs(id) on delete cascade,
  influencer_id   uuid not null references public.influencers(id) on delete cascade,
  proposed_amount integer,
  pitch           text,
  status          text not null default 'pending'
                    check (status in ('pending','shortlisted','accepted','declined','withdrawn')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (posting_id, influencer_id)
);

create index if not exists idx_collab_applications_posting on public.collab_applications(posting_id);
create index if not exists idx_collab_applications_influencer on public.collab_applications(influencer_id);

alter table public.collab_applications enable row level security;

drop policy if exists "apps_creator_insert" on public.collab_applications;
create policy "apps_creator_insert" on public.collab_applications
  for insert with check (
    exists (select 1 from public.influencers i where i.id = influencer_id and i.user_id = auth.uid())
  );

drop policy if exists "apps_read_own_or_owner" on public.collab_applications;
create policy "apps_read_own_or_owner" on public.collab_applications
  for select using (
    exists (select 1 from public.influencers i where i.id = influencer_id and i.user_id = auth.uid())
    or exists (
      select 1 from public.collabs c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = posting_id and r.owner_id = auth.uid()
    )
  );

drop policy if exists "apps_update_own_or_owner" on public.collab_applications;
create policy "apps_update_own_or_owner" on public.collab_applications
  for update using (
    exists (select 1 from public.influencers i where i.id = influencer_id and i.user_id = auth.uid())
    or exists (
      select 1 from public.collabs c
      join public.restaurants r on r.id = c.restaurant_id
      where c.id = posting_id and r.owner_id = auth.uid()
    )
  );

-- Identity fixes: display_name + the creator-signup fields that were missing
-- (their absence made the signup upsert fail → blank profiles).
alter table public.influencers
  add column if not exists display_name        text,
  add column if not exists follower_range      text,
  add column if not exists primary_platform    text,
  add column if not exists city                text,
  add column if not exists instagram_verified  boolean not null default false;
