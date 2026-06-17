-- Allow 'both' as a diet_type so a single deal can appear in both the veg and
-- non-veg customer filters (no need to create duplicate veg/non-veg deals).
-- The customer feed treats 'both' as matching veg, egg, and nonveg filters.

ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_diet_type_check;
ALTER TABLE public.deals ADD CONSTRAINT deals_diet_type_check
  CHECK (diet_type = ANY (ARRAY['veg'::text, 'nonveg'::text, 'egg'::text, 'both'::text]));
