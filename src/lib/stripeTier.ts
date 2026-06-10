// Shared Stripe price → repeat_plus_tier mapping for webhook + sync routes.

export type StripeTier = 'free' | 'starter' | 'pro' | 'yearly';

function priceSet(...ids: (string | undefined)[]): Set<string> {
  return new Set(ids.filter(Boolean) as string[]);
}

const STARTER_PRICES = priceSet(
  process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID,
  process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
);

const PRO_MONTHLY_PRICES = priceSet(
  process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  process.env.STRIPE_PRO_THREE_MONTHLY_PRICE_ID,
  process.env.STRIPE_MONTHLY_PRICE_ID,
  process.env.STRIPE_THREE_MONTHLY_PRICE_ID,
);

const PRO_YEARLY_PRICES = priceSet(
  process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  process.env.STRIPE_YEARLY_PRICE_ID,
);

export function resolveStripeTier(priceId: string): StripeTier {
  if (STARTER_PRICES.has(priceId)) return 'starter';
  if (PRO_YEARLY_PRICES.has(priceId)) return 'yearly';
  if (PRO_MONTHLY_PRICES.has(priceId)) return 'pro';
  // Default unknown paid price to pro
  return 'pro';
}

export function resolveBillingPlan(priceId: string): string {
  if (priceId === process.env.STRIPE_STARTER_YEARLY_PRICE_ID ||
      priceId === process.env.STRIPE_PRO_YEARLY_PRICE_ID ||
      priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
    return 'yearly';
  }
  if (priceId === process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_PRO_THREE_MONTHLY_PRICE_ID ||
      priceId === process.env.STRIPE_THREE_MONTHLY_PRICE_ID) {
    return 'three_monthly';
  }
  return 'monthly';
}

/** Map mobile checkout body to internal Stripe price map key. */
export function resolveCheckoutPriceKey(body: {
  plan?: string;
  billing_interval?: string;
}): string | null {
  const plan = body.plan ?? 'pro';
  const interval = body.billing_interval ?? 'monthly';

  // Legacy keys passed directly
  const legacyKeys = [
    'monthly', 'three_monthly', 'yearly',
    'starter_monthly', 'starter_three_monthly', 'starter_yearly',
    'pro_monthly', 'pro_three_monthly', 'pro_yearly',
  ];
  if (legacyKeys.includes(plan)) return plan;

  // Mobile format: plan + billing_interval
  const intervalKey = interval === 'quarterly' ? 'three_monthly' : interval;
  if (plan === 'yearly') return `pro_yearly`;
  if (plan === 'starter' || plan === 'pro') {
    return `${plan}_${intervalKey}`;
  }

  return null;
}
