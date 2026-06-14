-- Help & Support: tickets + message threads

create table if not exists support_tickets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  portal          text not null check (portal in ('customer', 'restaurant')),
  restaurant_id   uuid references restaurants(id) on delete set null,
  claim_id        uuid references claims(id) on delete set null,
  category        text not null check (category in ('claim', 'technical', 'payment', 'account', 'general')),
  subject         text not null,
  description     text not null,
  contact_email   text not null,
  status          text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  priority        text not null default 'normal' check (priority in ('normal', 'urgent')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  resolved_at     timestamptz
);

create table if not exists support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references support_tickets(id) on delete cascade not null,
  sender_id   uuid references auth.users(id) on delete cascade not null,
  content     text not null,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Indexes
create index if not exists support_tickets_user_id_idx  on support_tickets(user_id);
create index if not exists support_tickets_status_idx   on support_tickets(status);
create index if not exists support_messages_ticket_idx  on support_messages(ticket_id);

-- RLS
alter table support_tickets  enable row level security;
alter table support_messages enable row level security;

-- Users can read/create/update only their own tickets
create policy "support_tickets_select" on support_tickets
  for select using (auth.uid() = user_id);

create policy "support_tickets_insert" on support_tickets
  for insert with check (auth.uid() = user_id);

create policy "support_tickets_update" on support_tickets
  for update using (auth.uid() = user_id);

-- Users can read/insert messages on their own tickets only
create policy "support_messages_select" on support_messages
  for select using (
    exists (select 1 from support_tickets where id = ticket_id and user_id = auth.uid())
  );

create policy "support_messages_insert" on support_messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from support_tickets where id = ticket_id and user_id = auth.uid())
  );

-- Auto-update updated_at on ticket changes
create or replace function update_support_ticket_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger support_tickets_updated_at
  before update on support_tickets
  for each row execute function update_support_ticket_updated_at();
