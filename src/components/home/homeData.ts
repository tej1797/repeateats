// Static content + shared design tokens for the redesigned RepEAT homepage.
// Pure data — no React. Keeps section components lean.

export const C = {
  // base surfaces (transparent so the scroll watermark shows through)
  bg0: 'transparent',
  bg1: 'transparent',
  bg2: 'transparent',
  surface: '#151515',
  surfaceHi: '#1A1A1A',
  border: '#1E1E1E',
  border2: '#262626',
  // text
  text: '#FFFFFF',
  textSoft: '#A1A1A1',
  textMute: '#666666',
  textFaint: '#3A3A3A',
  // brand
  orange: '#FF6B00',
  orangeHi: '#FF8534',
  // portal accents
  customer: '#FF6B00',
  restaurant: '#2E6BE6',
  creator: '#A855F7',
  green: '#22C55E',
} as const;

export const FONT_DISPLAY = 'var(--font-syne, Syne, sans-serif)';
export const FONT_BODY = 'var(--font-jakarta, "Plus Jakarta Sans", sans-serif)';

export type Portal = {
  key: 'customer' | 'restaurant' | 'creator';
  label: string;
  kicker: string;
  title: string;
  desc: string;
  cta: string;
  href: string;
  color: string;
  glow: string;
  img: string;
};

export const PORTALS: Portal[] = [
  {
    key: 'customer',
    label: 'Customers',
    kicker: 'Browse Deals',
    title: "I'm here to eat",
    desc: 'Find restaurant promotions near you. Claim with one tap, show your QR at the door, and save.',
    cta: 'Browse deals',
    href: '/customer/preview',
    color: C.customer,
    glow: 'rgba(255,107,0,0.35)',
    img: '/home/burger.png',
  },
  {
    key: 'restaurant',
    label: 'Restaurants',
    kicker: 'List Your Restaurant',
    title: 'I run a restaurant',
    desc: 'Post deals, track claims, and go live in minutes. Reach hungry locals without the delivery-app fees.',
    cta: 'List restaurant',
    href: '/restaurant',
    color: C.restaurant,
    glow: 'rgba(46,107,230,0.35)',
    img: '/home/restaurant.png',
  },
  {
    key: 'creator',
    label: 'Creators',
    kicker: 'Food Creator',
    title: "I'm a food creator",
    desc: 'Find paid collabs and earn from restaurant content. Get matched with venues that love your work.',
    cta: 'Start creating',
    href: '/influencer',
    color: C.creator,
    glow: 'rgba(168,85,247,0.35)',
    img: '/home/creator.png',
  },
];

export const LIVE_TICKER = [
  { text: "Pani Puri at India's Taste", time: 'just claimed' },
  { text: '30% Off at Nirvana Restaurant', time: '3 min ago' },
  { text: 'Buy 2 Get 1 Bubble Tea', time: '5 min ago' },
  { text: '$10 Off Karahi Boys', time: 'just claimed' },
  { text: 'Free Appetizer at Tokyo Garden', time: '8 min ago' },
  { text: '$15 Off Lancaster Smokehouse', time: '12 min ago' },
  { text: 'BOGO Pizza at Pizza Nova', time: 'just claimed' },
  { text: 'Free Dessert at Gusto 101', time: '6 min ago' },
];

export const RESTAURANT_LOGOS = [
  'Pizza Nova', 'Tokyo Garden', 'Karahi Boys', 'Chatime', 'Nirvana',
  'Mughal Mahal', 'Sushi Garden', 'Burrito Boyz', 'Gusto 101',
  'Lancaster Smokehouse', "India's Taste", 'Chai Stop',
];

export const STEPS = [
  { num: '01', title: 'Browse deals', desc: 'Filter by city, cuisine, or deal type. Fresh deals land every week from local spots.' },
  { num: '02', title: 'Claim with one tap', desc: 'Hit Claim — your personal QR code is generated instantly. No verification, no waiting.' },
  { num: '03', title: 'Show QR at the door', desc: 'Open your QR at the restaurant. Staff scan it and you pocket the savings on the spot.' },
];

export const TRENDING_DEALS = [
  { emoji: '🍕', title: '30% Off Any Pizza', restaurant: 'Pizza Nova', city: 'Toronto', tag: 'Dine-in', discount: '30%' },
  { emoji: '🍜', title: 'Buy 2 Get 1 Free Ramen', restaurant: 'Tokyo Garden', city: 'Mississauga', tag: 'Takeout', discount: 'B2G1' },
  { emoji: '🍗', title: '$10 Off Karahi Bowl', restaurant: 'Karahi Boys', city: 'Brampton', tag: 'Dine-in', discount: '$10' },
  { emoji: '🧋', title: 'Free Bubble Tea w/ Order', restaurant: 'Chatime', city: 'Waterloo', tag: 'Pickup', discount: 'Free' },
  { emoji: '🍛', title: 'Free Appetizer w/ Entrée', restaurant: 'Nirvana Restaurant', city: 'Kitchener', tag: 'Dine-in', discount: 'Free' },
  { emoji: '🥗', title: '20% Off Entire Order', restaurant: 'Mughal Mahal', city: 'Hamilton', tag: 'Dine-in', discount: '20%' },
  { emoji: '🍣', title: 'BOGO Sushi Rolls', restaurant: 'Sushi Garden', city: 'Oakville', tag: 'Dine-in', discount: 'BOGO' },
  { emoji: '🌮', title: '$5 Off Any Burrito', restaurant: 'Burrito Boyz', city: 'Toronto', tag: 'Takeout', discount: '$5' },
];

export const BENEFITS = [
  { icon: 'bolt', title: 'Instant claims', desc: 'One tap generates your QR. No forms, no codes to copy, no waiting.' },
  { icon: 'wallet', title: 'Dine-in and Takeout', desc: 'Claim in person and save the full discount — no third-party surcharges.' },
  { icon: 'calendar', title: 'Fresh weekly deals', desc: 'New promotions drop every week from restaurants across Ontario.' },
  { icon: 'mapPin', title: 'Right in your city', desc: 'Filter by city, cuisine and deal type to find what is close to you.' },
  { icon: 'shield', title: 'No hidden costs', desc: 'Browsing and claiming deals is always free. No credit card required.' },
  { icon: 'store', title: 'Support Small Restaurants', desc: 'Every claim sends business straight to independent neighbourhood spots.' },
  { icon: 'wallet', title: 'Support Creators', desc: 'Creators or influencers can connect with restaurants for paid collaborations.' },
  { icon: 'store', title: 'Flat Restaurant Fee', desc: 'Flat fees for restaurants, no commission on food prices.' },
];

export const STATS = [
  { value: 400, suffix: '+', label: 'Restaurants' },
  { value: 12000, suffix: '+', label: 'Deals claimed' },
  { value: 15, suffix: '', label: 'Ontario cities' },
  { value: 0, prefix: '$', suffix: '', label: 'Monthly fee' },
];

export const TESTIMONIALS = [
  { quote: 'I grabbed a 30% off deal at my favourite ramen spot in literally two taps. Showed the QR, done. This is how it should work.', name: 'Priya S.', role: 'Diner · Mississauga', accent: 'customer' as const },
  { quote: 'We filled tables on slow weeknights without paying any delivery commission. Posting a deal takes about a minute.', name: 'Marco D.', role: 'Owner · Gusto 101', accent: 'restaurant' as const },
  { quote: 'RepEAT matched me with three restaurants for paid collabs in my first week. Finally a clean way to monetize food content.', name: 'Aisha K.', role: 'Creator · Toronto', accent: 'creator' as const },
  { quote: 'No app maze, no minimum spend, no surprise fees. Just real discounts at real restaurants near me.', name: 'Jordan L.', role: 'Diner · Brampton', accent: 'customer' as const },
];

export const FAQS = [
  { q: 'Is RepEAT free to use?', a: 'Yes. Browsing and claiming deals is completely free, with no credit card required. RepEAT+ is an optional upgrade for unlimited claims and exclusive offers.' },
  { q: 'How do I redeem a deal?', a: 'Claim any deal with one tap to generate a personal QR code. Show it to staff at the restaurant — they scan it and your discount is applied instantly. No printing, no codes to type.' },
  { q: 'Which cities does RepEAT cover?', a: 'RepEAT is live across 15 cities in Ontario including Toronto, Mississauga, Brampton, Hamilton, Kitchener, Waterloo and more — with new cities added regularly.' },
  { q: 'I own a restaurant. How do I list deals?', a: 'Create a free restaurant account, complete a short onboarding, and post your first deal. You can go live in minutes and track every claim from your dashboard — with no delivery-app commission.' },
  { q: 'I’m a content creator. Can I earn through RepEAT?', a: 'Yes. Set up a creator profile and get matched with restaurants looking for paid collaborations. Negotiate, deliver content, and get paid — all in one place.' },
  { q: 'Are there delivery fees or hidden charges?', a: 'No. RepEAT is built around in-person claiming, so there are no delivery fees or third-party surcharges. The discount you see is the discount you get.' },
];
