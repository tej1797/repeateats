-- ============================================================
-- RepEAT Seed Data
-- Run AFTER schema.sql in Supabase Dashboard → SQL Editor
--
-- NOTE: owner_id is set to NULL because auth users cannot be
-- created via SQL. After running this:
--   1. Sign up a restaurant owner account in your app
--   2. Copy their user UUID from Supabase Auth dashboard
--   3. UPDATE restaurants SET owner_id = '<uuid>' WHERE ...
-- ============================================================

-- ─── Restaurants ────────────────────────────────────────────
-- We define fixed UUIDs so we can reference them in deals/collabs below.

INSERT INTO public.restaurants
  (id, owner_id, name, cuisine, category, city, address, phone, website,
   hours, is_live, accepts_dine_in, accepts_pickup, accepts_delivery,
   open_to_collabs, rating, review_count, description)
VALUES

-- GTA — Mississauga
('11111111-0001-0000-0000-000000000000', NULL,
 'Nirvana Restaurant', 'Indian', 'indian', 'Brampton',
 '2130 North Park Dr, Brampton, ON L6S 0C9',
 '+1 905-792-9111', 'nirvanarestaurant.ca',
 '{"all": "Daily 11AM–11PM"}',
 true, true, true, false, true,
 4.7, 312,
 'Authentic North Indian cuisine in Brampton. Famous for rich curries, tandoor dishes, and warm hospitality.'),

('11111111-0002-0000-0000-000000000000', NULL,
 'Mughal Mahal', 'Indian', 'indian', 'Mississauga',
 '2980 Drew Rd, Mississauga, ON L4T 0A7',
 '+1 905-451-9876', 'mughalmahal.ca',
 '{"all": "Tue–Sun 11AM–10PM"}',
 true, true, false, false, true,
 4.5, 187,
 'Authentic Mughlai cuisine in Mississauga — pani puri, pav bhaji, bhel puri.'),

('11111111-0003-0000-0000-000000000000', NULL,
 'Real Fruit Bubble Tea', 'Bubble Tea', 'bubbletea', 'Mississauga',
 '1151 Dundas St W, Mississauga, ON L5G 1E1',
 '+1 905-891-5432', 'realfruitbubbletea.com',
 '{"all": "Mon–Sun 10AM–10PM"}',
 true, false, true, true, false,
 4.3, 241,
 'Fresh fruit bubble teas, smoothies, and specialty drinks with real ingredients.'),

('11111111-0004-0000-0000-000000000000', NULL,
 'India''s Taste', 'Indian', 'indian', 'Toronto',
 '1315 Lawrence Ave E, Toronto, ON M3A 3R3',
 '+1 416-447-5100', 'indiastaste.ca',
 '{"all": "Mon–Sun 11AM–10PM"}',
 true, true, true, false, true,
 4.4, 156,
 'Classic Indian comfort food in East York. Known for butter chicken, biryani, and generous lunch specials.'),

('11111111-0005-0000-0000-000000000000', NULL,
 'Dhaba Express', 'Indian', 'indian', 'Mississauga',
 '2344 Hurontario St, Mississauga, ON L5A 2H1',
 '+1 905-272-4567', 'dhabaexpress.ca',
 '{"all": "Mon–Sun 11AM–10PM"}',
 true, true, false, false, false,
 4.2, 98,
 'Dhaba-style cooking — bold, hearty, and affordable. Weekday lunch specials are legendary.'),

('11111111-0006-0000-0000-000000000000', NULL,
 'Spice Route', 'Indian', 'indian', 'Mississauga',
 '5230 Dixie Rd, Mississauga, ON L4W 4Y5',
 '+1 905-602-8891', 'spiceroute.ca',
 '{"all": "Daily 5PM–10:30PM"}',
 true, true, false, false, true,
 4.6, 203,
 'Elevated Indian dining. Known for the Friday Family Feast — perfect for groups.'),

('11111111-0007-0000-0000-000000000000', NULL,
 'Chili''s Grill & Bar', 'Bar & Grill', 'bar', 'Mississauga',
 '4141 Living Arts Dr, Mississauga, ON L5B 4E1',
 '+1 905-276-0011', 'chilis.ca',
 '{"all": "Mon–Sun 11AM–11PM"}',
 true, true, false, false, false,
 4.1, 420,
 'Classic American grill. Best happy hour in the Square One area — 2-for-1 cocktails daily 4–7PM.'),

-- KW — Kitchener / Waterloo
('11111111-0008-0000-0000-000000000000', NULL,
 'Charcoal Steak House', 'Steakhouse', 'bbq', 'KW',
 '2980 King St E, Kitchener, ON N2A 1A9',
 '+1 519-893-6570', 'charcoalsteakhouse.ca',
 '{"mon_sat": "Mon–Sat 11AM–11PM", "sun": "Sun 9AM–10PM"}',
 true, true, false, false, true,
 4.6, 289,
 'KW''s premier steakhouse since 1956. Known for the legendary Beef Wellington.'),

('11111111-0009-0000-0000-000000000000', NULL,
 'The Bauer Kitchen', 'Canadian', 'canadian', 'KW',
 '187 King St S, Waterloo, ON N2L 0A5',
 '+1 519-772-0790', 'bauerkitchen.com',
 '{"mon_thu": "Mon–Thu 11AM–11PM", "fri_sat": "Fri–Sat 10AM–12AM"}',
 true, true, false, false, false,
 4.5, 178,
 'Contemporary Canadian cuisine in the historic Bauer building. Farm-to-table spirit.'),

('11111111-0010-0000-0000-000000000000', NULL,
 'Lancaster Smokehouse', 'BBQ', 'bbq', 'KW',
 '574 Lancaster St W, Kitchener, ON N2K 1M3',
 '+1 519-743-4331', 'lancastersmokehouse.com',
 '{"mon_sat": "Mon–Sat 11:30AM–9PM"}',
 true, true, true, false, true,
 4.6, 334,
 'Low and slow BBQ. Brisket, ribs, pulled pork — all smoked in-house. Weekend lineups are worth it.'),

('11111111-0011-0000-0000-000000000000', NULL,
 'PUBLIC Kitchen & Bar', 'Bar & Grill', 'bar', 'KW',
 '300 Victoria St N, Kitchener, ON N2H 6R7',
 '+1 519-954-8111', 'publickitchen.ca',
 '{"tue_sat": "Tue–Sat 4PM–10PM"}',
 true, true, false, false, true,
 4.6, 214,
 'Upscale casual dining in downtown Kitchener. Wednesday Buck-a-Shuck oyster nights are legendary.'),

('11111111-0012-0000-0000-000000000000', NULL,
 'Del''s Italian Kitchen', 'Italian', 'italian', 'KW',
 '2980 King St E, Kitchener, ON N2A 1A9',
 '+1 519-893-2911', 'delsitaliankitchen.com',
 '{"all": "Daily 4PM–10PM"}',
 true, true, false, false, false,
 4.6, 162,
 'Romantic Italian dining. Handmade pasta, candlelit atmosphere — perfect for date night.');


-- ─── Deals ──────────────────────────────────────────────────

INSERT INTO public.deals
  (id, restaurant_id, title, description, discount_type, discount_value,
   deal_types, available_days, scope, scope_detail, emoji,
   max_claims, current_claims, is_coming, is_active)
VALUES

-- Nirvana Restaurant
('22222222-0001-0000-0000-000000000000',
 '11111111-0001-0000-0000-000000000000',
 '$10 Off Any Curry (Family Size)',
 '$10 off any family-size curry. Tender braised lamb, chicken, or paneer in rich spiced sauce. Dine-in only, no min spend.',
 'fixed', '$10 OFF',
 ARRAY['dine-in'], ARRAY['all'], 'category', 'Family-size Karahis', '🍛',
 100, 67, false, true),

-- Mughal Mahal
('22222222-0002-0000-0000-000000000000',
 '11111111-0002-0000-0000-000000000000',
 'Free Naan with Any Main Course',
 'Order any main course and get complimentary naan. Authentic Mughlai biryani, kebabs, and curries in Mississauga.',
 'free_item', 'FREE',
 ARRAY['dine-in'], ARRAY['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 'single', 'Pani Puri (6 pcs)', '🥘',
 60, 43, false, true),

-- Real Fruit Bubble Tea
('22222222-0003-0000-0000-000000000000',
 '11111111-0003-0000-0000-000000000000',
 'Buy 2 Get 1 Free — Any Drink',
 'Buy any 2 drinks and get the cheapest one free. Valid on all bubble tea, smoothies, and specialty drinks. Pickup only.',
 'bogo', 'BUY 2 GET 1',
 ARRAY['pickup'], ARRAY['all'], 'menu', NULL, '🧋',
 200, 89, false, true),

-- India's Taste
('22222222-0004-0000-0000-000000000000',
 '11111111-0004-0000-0000-000000000000',
 'Lunch Thali Special — $12',
 'Full thali — dal, sabzi, rice, 2 rotis, salad, and dessert for only $12. Weekday lunch special. Dine-in only.',
 'set_price', '$12 THALI',
 ARRAY['dine-in'], ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], 'bundle', 'Lunch Thali', '🍲',
 80, 55, false, true),

-- Dhaba Express — Coming Next Week
('22222222-0005-0000-0000-000000000000',
 '11111111-0005-0000-0000-000000000000',
 '20% Off Entire Menu — Mondays',
 'Every Monday — 20% off your entire order. Authentic Punjabi dhaba-style food. Dine-in only, no code needed.',
 'percentage', '20% OFF',
 ARRAY['dine-in'], ARRAY['Mon'], 'menu', NULL, '🍱',
 50, 22, true, true),

-- Spice Route — Coming Next Week
('22222222-0006-0000-0000-000000000000',
 '11111111-0006-0000-0000-000000000000',
 'Family Feast for 4 — $49',
 'Family feast for 4 — 2 curries, biryani, naan, raita, and gulab jamun. Perfect Friday or Saturday dinner.',
 'set_price', '$49 DEAL',
 ARRAY['dine-in'], ARRAY['Fri', 'Sat'], 'bundle', 'Family Feast for 4', '🫕',
 40, 31, true, true),

-- Chili's
('22222222-0007-0000-0000-000000000000',
 '11111111-0007-0000-0000-000000000000',
 'Happy Hour: 2-for-1 Cocktails',
 '2-for-1 cocktails every day 4–7 PM. Margaritas, mojitos, and bar specials. Dine-in only, must be seated.',
 'bogo', '2 FOR 1',
 ARRAY['dine-in'], ARRAY['all'], 'category', 'All Cocktails', '🍹',
 150, 77, false, true),

-- Charcoal Steak House
('22222222-0008-0000-0000-000000000000',
 '11111111-0008-0000-0000-000000000000',
 '20% Off Beef Wellington',
 '20% off our famous Beef Wellington. AAA beef in golden pastry. Dine-in only, show RepEAT QR to server.',
 'percentage', '20% OFF',
 ARRAY['dine-in'], ARRAY['all'], 'single', 'Beef Wellington', '🥩',
 60, 34, false, true),

-- The Bauer Kitchen
('22222222-0009-0000-0000-000000000000',
 '11111111-0009-0000-0000-000000000000',
 'Free Dessert with Any Entrée',
 'Order any entrée and choose a complimentary dessert. Crème brûlée, lemon tart, or seasonal sorbet.',
 'free_item', 'FREE DESSERT',
 ARRAY['dine-in'], ARRAY['all'], 'single', 'Any Dessert', '🍁',
 40, 28, false, true),

-- Lancaster Smokehouse
('22222222-0010-0000-0000-000000000000',
 '11111111-0010-0000-0000-000000000000',
 '2-for-1 BBQ Platters',
 'Order one BBQ Platter, get the second free. Mix brisket, ribs, or pulled pork. Pickup only.',
 'bogo', '2 FOR 1',
 ARRAY['pickup'], ARRAY['Sat', 'Sun'], 'category', 'BBQ Platters', '🍖',
 30, 19, false, true),

-- PUBLIC Kitchen & Bar — Coming Next Week
('22222222-0011-0000-0000-000000000000',
 '11111111-0011-0000-0000-000000000000',
 'Buck-a-Shuck — $1 Oysters',
 '$1 oysters every Wednesday. No min, no max. Best deal in KW. Comes with mignonette or hot sauce.',
 'set_price', '$1 EACH',
 ARRAY['dine-in'], ARRAY['Wed'], 'single', 'Oysters', '🦞',
 80, 38, true, true),

-- Del's Italian Kitchen
('22222222-0012-0000-0000-000000000000',
 '11111111-0012-0000-0000-000000000000',
 'Date Night: 2 Courses for $45',
 'Any starter + any main for $45/person. Homemade pasta, candlelit atmosphere. Perfect for date night.',
 'set_price', '$45 DEAL',
 ARRAY['dine-in'], ARRAY['Fri', 'Sat'], 'bundle', 'Starter + Main', '🍕',
 35, 22, false, true),

-- Nirvana Restaurant — extra
('22222222-0013-0000-0000-000000000000',
 '11111111-0001-0000-0000-000000000000',
 'Free Chai with Any Main Course',
 'Get a complimentary mango lassi with every main course ordered. Valid all week, dine-in only.',
 'free_item', 'FREE CHAI',
 ARRAY['dine-in'], ARRAY['all'], 'single', 'Chai', '☕',
 NULL, 14, false, true),

-- India's Taste — weekend
('22222222-0014-0000-0000-000000000000',
 '11111111-0004-0000-0000-000000000000',
 'Weekend Family Platter — $35',
 'Saturday and Sunday special: Full family platter with 3 curries, biryani, naan, and dessert.',
 'set_price', '$35 PLATTER',
 ARRAY['dine-in'], ARRAY['Sat', 'Sun'], 'bundle', 'Family Platter', '🎉',
 30, 11, false, true),

-- Spice Route — pickup
('22222222-0015-0000-0000-000000000000',
 '11111111-0006-0000-0000-000000000000',
 '10% Off All Pickup Orders',
 'Save 10% on any pickup order over $25. Valid every day — just mention RepEAT when you call or show the QR.',
 'percentage', '10% OFF',
 ARRAY['pickup'], ARRAY['all'], 'menu', NULL, '🛍️',
 NULL, 9, false, true);


-- ─── Collabs ────────────────────────────────────────────────
-- influencer_id is NULL (open listings — no influencer matched yet)

INSERT INTO public.collabs
  (id, restaurant_id, influencer_id, offer_amount_min, offer_amount_max,
   deliverables, requirements, brief, status)
VALUES

('33333333-0001-0000-0000-000000000000',
 '11111111-0001-0000-0000-000000000000', NULL,
 150, 300, '1 Reel + 3 Stories', '8K–25K followers',
 'Showcase our authentic Indian dining experience. South Asian audience preferred. Show the cooking process, the aroma, the joy of sharing food.',
 'open'),

('33333333-0002-0000-0000-000000000000',
 '11111111-0002-0000-0000-000000000000', NULL,
 80, 150, '2 Stories + 1 Post', '5K+ followers',
 'Mughlai biryani, kebabs, rich curries — regal food vibes in Mississauga. Fun, energetic, colourful content wanted!',
 'open'),

('33333333-0003-0000-0000-000000000000',
 '11111111-0008-0000-0000-000000000000', NULL,
 300, 500, '1 YouTube Short + 1 Reel', '25K+ followers',
 'Premium Beef Wellington showcase. Upscale feel — anniversaries, date nights. Refined food photography welcome.',
 'open'),

('33333333-0004-0000-0000-000000000000',
 '11111111-0011-0000-0000-000000000000', NULL,
 80, 120, '2 Stories + 1 Post', '5K+ followers',
 'Promote our Wednesday Buck-a-Shuck oyster night. Fun crowd, great atmosphere, great drinks.',
 'open'),

('33333333-0005-0000-0000-000000000000',
 '11111111-0004-0000-0000-000000000000', NULL,
 100, 200, '1 Reel', '5K+ followers',
 'Authentic Indian comfort food. We want warm, inviting content that speaks to the South Asian diaspora.',
 'open'),

('33333333-0006-0000-0000-000000000000',
 '11111111-0010-0000-0000-000000000000', NULL,
 200, 350, '1 TikTok + 1 Reel', '15K+ followers',
 'High-energy BBQ taste-test. Legendary platters, massive portions. We want wow reactions and honest reviews.',
 'open'),

('33333333-0007-0000-0000-000000000000',
 '11111111-0006-0000-0000-000000000000', NULL,
 120, 250, '1 Reel + carousel', '8K+ followers',
 'Family feast content. Warm family dining experience, vibrant colours, multiple dishes. Weekend content focus.',
 'open');
