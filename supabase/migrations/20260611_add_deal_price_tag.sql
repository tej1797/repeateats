-- Optional price bucket tag for customer "Under $6" / "Under $12" filters
alter table public.deals
  add column if not exists price_tag text check (price_tag in ('under6', 'under12'));

comment on column public.deals.price_tag is 'Optional: under6 | under12 for customer price filters';
