export const BRAND = {
  name: 'RepEAT',
  tagline: 'Restaurant deals, claimed in person.',
  domain: 'repeateats.ca',
  colors: {
    brand:       '#FF6B00',
    brandLight:  '#FF9A4D',
    brandBg:     '#FFF3EC',
    brandDark:   '#CC5500',
    green:       '#065F46',
    greenBg:     '#ECFDF5',
    purple:      '#7E22CE',
    purpleBg:    '#FDF4FF',
    gold:        '#FFBF00',
    bg:          '#0C0A09',
    surface:     '#141414',
    surface2:    '#1E1E1E',
    border:      'rgba(255,255,255,0.08)',
    text:        '#F2F2F2',
    textMuted:   '#999999',
  },
  fonts: {
    heading: "'Syne', sans-serif",
    body:    "'Plus Jakarta Sans', sans-serif",
  },
  portals: {
    customer:   { color: '#FF6B00', label: 'Customer',   icon: 'users' },
    restaurant: { color: '#1249A9', label: 'Restaurant', icon: 'building-store' },
    influencer: { color: '#7E22CE', label: 'Creator',    icon: 'device-mobile-star' },
  },
} as const

export const CUISINES = [
  { id: 'all',       label: 'All',        emoji: '🍽️', image: null },
  { id: 'pizza',     label: 'Pizza',      emoji: '🍕', image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200&q=70' },
  { id: 'indian',    label: 'Indian',     emoji: '🍛', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200&q=70' },
  { id: 'shawarma',  label: 'Shawarma',   emoji: '🥙', image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=200&q=70' },
  { id: 'mexican',   label: 'Mexican',    emoji: '🌮', image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=200&q=70' },
  { id: 'desserts',  label: 'Desserts',   emoji: '🧁', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&q=70' },
  { id: 'chinese',   label: 'Chinese',    emoji: '🥢', image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=200&q=70' },
  { id: 'cafe',      label: 'Cafe',       emoji: '☕', image: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&q=70' },
  { id: 'ramen',     label: 'Ramen',      emoji: '🍜', image: 'https://images.unsplash.com/photo-1549692520-acc6669e2f0c?w=200&q=70' },
  { id: 'burgers',   label: 'Burgers',    emoji: '🍔', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&q=70' },
  { id: 'italian',   label: 'Italian',    emoji: '🍝', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&q=70' },
  { id: 'bubbletea', label: 'Bubble Tea', emoji: '🧋', image: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=200&q=70' },
] as const

export const DEAL_FILTERS = [
  { id: 'all',        label: 'All Types',   icon: null   },
  { id: 'dine-in',    label: 'Dine-in',     icon: '🍽️'  },
  { id: 'pickup',     label: 'Pickup',      icon: '📦'   },
  { id: 'bogo',       label: 'BOGO',        icon: '🔥'   },
  { id: 'percentage', label: '% Off',       icon: '💰'   },
  { id: 'free',       label: 'Free Item',   icon: '🎁'   },
  { id: 'combo',      label: 'Combo Deal',  icon: '🍱'   },
  { id: 'happy_hour', label: 'Happy Hour',  icon: '🍹'   },
] as const

export type DealFilterId = typeof DEAL_FILTERS[number]['id']

export const ONTARIO_CITIES = [
  'GTA Area', 'Mississauga', 'Brampton', 'Toronto',
  'Markham', 'Scarborough', 'North York', 'Etobicoke',
  'Vaughan', 'Richmond Hill', 'Oakville', 'Burlington',
  'Hamilton', 'Kitchener', 'Waterloo', 'Cambridge',
  'London', 'Ottawa', 'Oshawa', 'Ajax', 'Pickering',
  'Milton', 'Guelph', 'Barrie', 'St. Catharines',
] as const
