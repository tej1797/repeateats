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


-- ─── Google Reviews (run AFTER adding google_* columns) ─────────────────
-- Representative demo reviews. Replace with real data once GOOGLE_PLACES_API_KEY
-- is configured -- the app will auto-refresh every 24 hours from the live API.

-- Nirvana Restaurant (Brampton, Indian) 4.7
UPDATE public.restaurants SET
  google_rating = 4.7, google_review_count = 312,
  google_reviews = '[
    {"author_name": "Priya Sharma", "rating": 5, "text": "Best butter chicken in Brampton! The spices are perfectly balanced and the naan is made fresh to order. We come here almost every weekend now.", "relative_time_description": "2 months ago"},
    {"author_name": "Gurpreet Singh", "rating": 5, "text": "Authentic North Indian food just like home. The lamb karahi is outstanding — rich, flavorful, perfectly spiced. Service is warm and the price is very reasonable.", "relative_time_description": "3 months ago"},
    {"author_name": "Aisha Mohammed", "rating": 4, "text": "Really enjoyed the tandoor dishes. Seekh kebabs were tender and the dal makhani was excellent. Can get busy on weekends but the food is worth the wait.", "relative_time_description": "1 month ago"},
    {"author_name": "David Kim", "rating": 5, "text": "Took my whole family here and everyone loved it. The paneer makhani with garlic naan is unbeatable. Will definitely be back.", "relative_time_description": "5 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0001-0000-0000-000000000000';

-- Mughal Mahal (Mississauga, Indian) 4.5
UPDATE public.restaurants SET
  google_rating = 4.5, google_review_count = 187,
  google_reviews = '[
    {"author_name": "Meera Patel", "rating": 5, "text": "The biryani here is incredible. Rich, fragrant, with perfectly cooked basmati. The free naan deal with a main is an amazing value. Always my first choice in Mississauga.", "relative_time_description": "1 month ago"},
    {"author_name": "Harpreet Bains", "rating": 4, "text": "Authentic Mughlai flavours — the kebab platter is the best in the GTA. Seating can be tight but the food more than makes up for it.", "relative_time_description": "2 months ago"},
    {"author_name": "Sarah Mitchell", "rating": 5, "text": "Came for lunch on a Tuesday and was blown away. The dal makhani and naan combo is pure comfort food. Staff were incredibly friendly.", "relative_time_description": "4 months ago"},
    {"author_name": "Omar Farooq", "rating": 4, "text": "Great authentic food. The nihari is a weekend special and it is absolutely phenomenal. A little spicy but in the best possible way.", "relative_time_description": "6 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0002-0000-0000-000000000000';

-- Real Fruit Bubble Tea (Mississauga) 4.3
UPDATE public.restaurants SET
  google_rating = 4.3, google_review_count = 241,
  google_reviews = '[
    {"author_name": "Jessica Wong", "rating": 5, "text": "Best bubble tea in Mississauga, hands down. The taro milk tea with fresh taro is unreal. Love that they use real fruit instead of syrups.", "relative_time_description": "3 weeks ago"},
    {"author_name": "Tyler Chen", "rating": 4, "text": "Super fresh drinks. The mango smoothie is basically mango juice with a straw. Buy 2 get 1 free deal makes it ridiculously good value.", "relative_time_description": "2 months ago"},
    {"author_name": "Natalie Park", "rating": 4, "text": "Love the customization options. I got the strawberry milk tea with 50% sugar and it was perfect. Staff are always friendly.", "relative_time_description": "1 month ago"},
    {"author_name": "Ravi Kumar", "rating": 5, "text": "Genuine real-fruit drinks that taste amazing. The lychee series is seasonal but worth hunting for. My go-to spot after work.", "relative_time_description": "5 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0003-0000-0000-000000000000';

-- India''s Taste (Toronto, Indian) 4.4
UPDATE public.restaurants SET
  google_rating = 4.4, google_review_count = 156,
  google_reviews = '[
    {"author_name": "Sunita Verma", "rating": 5, "text": "The $12 lunch thali is the best deal in East York. Dal, sabzi, rice, roti, salad, dessert -- absolutely packed with flavour. Cannot beat the value.", "relative_time_description": "1 month ago"},
    {"author_name": "Michael Torres", "rating": 4, "text": "Discovered this place through a friend and now it is a weekly ritual. The butter chicken is rich and comforting. Staff treat you like family.", "relative_time_description": "2 months ago"},
    {"author_name": "Parminder Gill", "rating": 5, "text": "Authentic home-style Indian cooking. The daal tadka reminds me of my mum''s kitchen. Generous portions and very reasonable pricing.", "relative_time_description": "3 months ago"},
    {"author_name": "Jennifer Walsh", "rating": 4, "text": "Great neighbourhood gem. The biryani on the weekends is exceptional. Parking can be tricky on Lawrence but the food is 100% worth it.", "relative_time_description": "4 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0004-0000-0000-000000000000';

-- Dhaba Express (Mississauga, Indian) 4.2
UPDATE public.restaurants SET
  google_rating = 4.2, google_review_count = 98,
  google_reviews = '[
    {"author_name": "Amrit Dhaliwal", "rating": 5, "text": "No-frills, honest dhaba food that hits every time. The Monday deal is absolutely insane value -- 20% off everything. I always come here on Mondays now.", "relative_time_description": "3 weeks ago"},
    {"author_name": "Preethi Nair", "rating": 4, "text": "The rajma chawal is outstanding and the parathas are made fresh. Very casual atmosphere but the food quality is genuinely great.", "relative_time_description": "2 months ago"},
    {"author_name": "Brandon Lee", "rating": 4, "text": "Tried the chole bhature here on a friend''s recommendation. Massive portions, great flavour, very affordable. Solid neighbourhood spot.", "relative_time_description": "4 months ago"},
    {"author_name": "Kavita Menon", "rating": 4, "text": "Authentic taste that takes me back to Punjab. The lassi is excellent and the dal makhani is slow-cooked to perfection.", "relative_time_description": "5 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0005-0000-0000-000000000000';

-- Spice Route (Mississauga, Indian) 4.6
UPDATE public.restaurants SET
  google_rating = 4.6, google_review_count = 203,
  google_reviews = '[
    {"author_name": "Anjali Kapoor", "rating": 5, "text": "The Friday Family Feast for 4 is an absolute steal at $49. Two curries, biryani, naan, raita -- you leave completely satisfied. Ambiance is lovely too.", "relative_time_description": "2 months ago"},
    {"author_name": "Chris Nguyen", "rating": 5, "text": "Elevated Indian dining done right. The lamb rogan josh is exceptional. Feels like a special occasion every time, but the prices are very fair.", "relative_time_description": "1 month ago"},
    {"author_name": "Deepa Subramaniam", "rating": 4, "text": "Beautiful plating and complex flavours. The mango lassi is thick and refreshing. Perfect date night restaurant in Mississauga.", "relative_time_description": "3 months ago"},
    {"author_name": "Mark Bouchard", "rating": 5, "text": "Went for the Family Feast and could not believe the quality and quantity for $49. The biryani alone is worth the visit. Highly recommend.", "relative_time_description": "6 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0006-0000-0000-000000000000';

-- Chili''s Grill & Bar (Mississauga) 4.1
UPDATE public.restaurants SET
  google_rating = 4.1, google_review_count = 420,
  google_reviews = '[
    {"author_name": "Jake Morrison", "rating": 4, "text": "The happy hour 2-for-1 deal is unbeatable for the Square One area. Margaritas are solid and the nachos are massive. Great spot for after-work drinks.", "relative_time_description": "1 month ago"},
    {"author_name": "Stephanie Ramos", "rating": 5, "text": "Came for the cocktail deal and stayed for three rounds. Friendly bartenders, great atmosphere. The ribs are also surprisingly good.", "relative_time_description": "2 months ago"},
    {"author_name": "Brendan O''Neill", "rating": 4, "text": "Classic Chili''s quality with a solid happy hour. The Old Timer burger is my go-to. Gets loud on Friday evenings but that adds to the energy.", "relative_time_description": "3 months ago"},
    {"author_name": "Lisa Fernandez", "rating": 4, "text": "We grabbed the 2-for-1 cocktails after work -- amazing value and they were delicious. Service was attentive even when it got busy.", "relative_time_description": "4 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0007-0000-0000-000000000000';

-- Charcoal Steak House (Kitchener, Steakhouse) 4.6
UPDATE public.restaurants SET
  google_rating = 4.6, google_review_count = 289,
  google_reviews = '[
    {"author_name": "Robert MacLean", "rating": 5, "text": "KW''s finest steakhouse and it has been for decades. The Beef Wellington is a masterpiece -- perfectly cooked with beautiful pastry. Worth every penny.", "relative_time_description": "1 month ago"},
    {"author_name": "Cynthia Foster", "rating": 5, "text": "Celebrating our anniversary here has become a tradition. Impeccable service, beautiful atmosphere, and the ribeye is the best in the region.", "relative_time_description": "2 months ago"},
    {"author_name": "Alan Kowalski", "rating": 4, "text": "The dry-aged sirloin was outstanding. Sides are generous and the wine list is excellent. A bit pricey but it is a special occasion restaurant.", "relative_time_description": "3 months ago"},
    {"author_name": "Diana Schulz", "rating": 5, "text": "Absolute institution in Kitchener. The Sunday brunch is spectacular but the weeknight dinners are what legends are made of. Perfect service.", "relative_time_description": "5 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0008-0000-0000-000000000000';

-- The Bauer Kitchen (Waterloo, Canadian) 4.5
UPDATE public.restaurants SET
  google_rating = 4.5, google_review_count = 178,
  google_reviews = '[
    {"author_name": "Emily Hartman", "rating": 5, "text": "The farm-to-table philosophy really shows in every dish. The roasted beet salad and the pan-seared trout were outstanding. Gorgeous historic space too.", "relative_time_description": "3 weeks ago"},
    {"author_name": "Mathieu Gauthier", "rating": 5, "text": "Best restaurant in Waterloo full stop. The seasonal menu is always creative and the cocktail program is excellent. A must-visit for any foodie.", "relative_time_description": "2 months ago"},
    {"author_name": "Sophie Williams", "rating": 4, "text": "Lovely spot in a beautiful old building. The brunch is excellent -- eggs benny with house-cured salmon was phenomenal. Worth the weekend wait.", "relative_time_description": "1 month ago"},
    {"author_name": "Tomasz Wierzbicki", "rating": 4, "text": "Incredible atmosphere and thoughtful Canadian cuisine. The charcuterie board is an event in itself. Great date night or special occasion spot.", "relative_time_description": "4 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0009-0000-0000-000000000000';

-- Lancaster Smokehouse (Kitchener, BBQ) 4.6
UPDATE public.restaurants SET
  google_rating = 4.6, google_review_count = 334,
  google_reviews = '[
    {"author_name": "Travis Okafor", "rating": 5, "text": "The brisket here is a religious experience. Smoky bark, juicy interior, perfect smoke ring. The weekend lineup is worth every minute of the wait.", "relative_time_description": "2 months ago"},
    {"author_name": "Kelsey Brown", "rating": 5, "text": "Best BBQ in KW and it is not even close. The 3-meat platter is enormous and every protein is cooked to perfection. The house-made pickles are a bonus.", "relative_time_description": "1 month ago"},
    {"author_name": "Murray Tremblay", "rating": 4, "text": "The pulled pork sandwich is incredible -- the meat practically falls apart. Sides are solid too. Get there early or expect to wait on weekends.", "relative_time_description": "3 months ago"},
    {"author_name": "Aaron Diaz", "rating": 5, "text": "Drove 40 minutes just for Lancaster''s ribs and it was completely worth it. Fall-off-the-bone tender with the best dry rub I''ve ever had. Already planning my return.", "relative_time_description": "6 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0010-0000-0000-000000000000';

-- PUBLIC Kitchen & Bar (Kitchener) 4.6
UPDATE public.restaurants SET
  google_rating = 4.6, google_review_count = 214,
  google_reviews = '[
    {"author_name": "Natasha Brennan", "rating": 5, "text": "Buck-a-Shuck Wednesday is something special. Fresh oysters at a dollar each with excellent cocktails in a beautiful space. An absolute Kitchener institution.", "relative_time_description": "1 month ago"},
    {"author_name": "Derek Lam", "rating": 5, "text": "Incredible cocktail program and the food is equally impressive. The duck confit is phenomenal. Beautiful renovation of the space -- always buzzing.", "relative_time_description": "2 months ago"},
    {"author_name": "Isabelle Martin", "rating": 4, "text": "Took out-of-town guests here and they were completely wowed. The seafood dishes are exceptional and the service is polished without being stuffy.", "relative_time_description": "3 months ago"},
    {"author_name": "Greg Hannigan", "rating": 5, "text": "The best upscale casual restaurant in downtown Kitchener. The tasting menu on special occasions is absolutely worth it. Superb wine and cocktail list.", "relative_time_description": "5 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0011-0000-0000-000000000000';

-- Del''s Italian Kitchen (KW, Italian) 4.6
UPDATE public.restaurants SET
  google_rating = 4.6, google_review_count = 162,
  google_reviews = '[
    {"author_name": "Francesca Romano", "rating": 5, "text": "The handmade pasta is extraordinary -- you can taste the difference immediately. The candlelit atmosphere makes it the perfect date night spot in KW.", "relative_time_description": "2 months ago"},
    {"author_name": "Marco Ferretti", "rating": 5, "text": "As an Italian, I can say this is genuine, soulful Italian cooking. The cacio e pepe is impeccable. The tiramisu is the best outside of Italy.", "relative_time_description": "1 month ago"},
    {"author_name": "Hannah Schmidt", "rating": 4, "text": "Romantic atmosphere and delicious food. The pappardelle bolognese is rich and comforting. Excellent wine list with great Italian varietals.", "relative_time_description": "3 months ago"},
    {"author_name": "Paul Arsenault", "rating": 5, "text": "Proposed to my partner here and the staff made the entire evening magical. The food is world-class -- the osso buco is unforgettable. Thank you Del''s!", "relative_time_description": "4 months ago"}
  ]'::jsonb,
  last_synced_at = NOW()
WHERE id = '11111111-0012-0000-0000-000000000000';
