// Customer design tokens — must match mobile src/constants/customerUI.ts

export const CUSTOMER_UI = {
  bg:            '#0C0A09',
  bgElevated:    '#141210',
  accent:        '#FF6B00',
  accentSoft:    'rgba(255,107,0,0.16)',
  gold:          '#FFBF00',
  goldDeep:      '#CC9900',
  textPrimary:   '#FAFAF9',
  textSecondary: '#A8A29E',
  textMuted:     '#78716C',
  glassBg:       'rgba(28,26,24,0.55)',
  glassBorder:   'rgba(255,255,255,0.14)',
  cardRadius:    16,
  dockRadius:    32,
  filterHeight:  36,
  filterRadius:  12,
} as const;

export const METALLIC_GOLD = {
  base:     '#FFBF00',
  deep:     '#CC9900',
  gradient: 'linear-gradient(135deg, #FFBF00 0%, #CC9900 100%)',
} as const;

export const METALLIC_SILVER = {
  base:     '#B8B8B8',
  gradient: 'linear-gradient(135deg, #D4D4D4 0%, #B8B8B8 100%)',
} as const;
