// RepEAT+ CAD pricing — must match mobile src/constants/repeatPlusPlans.ts

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';
export type PlanSlug = 'starter' | 'pro';

export interface PlanPrice {
  amount:     string;
  sub:        string;
  perMonth:   number;
  stripeKey:  string;
}

export const REPEAT_PLUS_PRICES: Record<PlanSlug, Record<BillingInterval, PlanPrice>> = {
  starter: {
    monthly:   { amount: '$2.99', sub: '/month',                              perMonth: 2.99, stripeKey: 'starter_monthly'       },
    quarterly: { amount: '$2.66', sub: '/month · $7.99 per 3 months — save 11%', perMonth: 2.66, stripeKey: 'starter_three_monthly' },
    yearly:    { amount: '$2.08', sub: '/month · $24.99/year — save 30%',     perMonth: 2.08, stripeKey: 'starter_yearly'        },
  },
  pro: {
    monthly:   { amount: '$3.99', sub: '/month',                              perMonth: 3.99, stripeKey: 'pro_monthly'           },
    quarterly: { amount: '$3.33', sub: '/month · $9.99 per 3 months — save 17%', perMonth: 3.33, stripeKey: 'pro_three_monthly'     },
    yearly:    { amount: '$2.49', sub: '/month · $29.99/year — save 37%',     perMonth: 2.49, stripeKey: 'pro_yearly'            },
  },
};

export const STARTER_FEATURES = [
  '3 redemptions per day',
  '20 redemptions per month',
  'Claim deals 2 days ahead',
  '120-minute visit window',
];

export const PRO_FEATURES = [
  '3 redemptions per day',
  '30 redemptions per month',
  'Claim deals 7 days ahead',
  '180-minute visit window',
  'Exclusive premium deals',
];
