-- Price of one item, so customers know the cost before claiming (esp. BOGO).
-- For free_item deals there is no price; instead a qualifying condition is stored:
--   free_condition_type = 'spend' (min $ spend) or 'item' (required purchase)
--   free_condition_value = the dollar amount (as text) or the dish name
alter table public.deals
  add column if not exists base_price numeric,
  add column if not exists free_condition_type text,
  add column if not exists free_condition_value text;

alter table public.deals drop constraint if exists deals_free_condition_type_check;
alter table public.deals add constraint deals_free_condition_type_check
  check (free_condition_type is null or free_condition_type in ('spend','item'));
