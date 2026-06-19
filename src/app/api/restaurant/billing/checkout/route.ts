// POST /api/restaurant/billing/checkout — start a Stripe Checkout subscription for
// a restaurant LOCATION. Body: { plan:'starter'|'pro', mode:'flat'|'usage',
// cycle:'monthly'|'yearly', return_url }. Charges the restaurant's own Stripe
// customer (per-location billing). If the location is still on its Pro trial, the
// subscription's trial_end is set so the first charge lands at trial end.
//
// Requires Stripe restaurant price IDs in env (see below). Until those are set the
// route returns a clear 400 so the UI can say "billing setup pending".
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getOrCreateRestaurantCustomer, getServiceClient } from '@/lib/stripeAuth';

// env var name for a given plan/mode/cycle base price
function basePriceEnv(plan: string, mode: string, cycle: string): string | undefined {
  const key = `STRIPE_REST_${plan}_${mode}_${cycle}_PRICE_ID`.toUpperCase();
  return process.env[key];
}
// metered overage price (usage mode only)
function meteredPriceEnv(plan: string): string | undefined {
  return process.env[`STRIPE_REST_${plan}_USAGE_METERED_PRICE_ID`.toUpperCase()];
}

export async function POST(request: NextRequest) {
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan, mode, cycle, return_url } = await request.json().catch(() => ({})) as {
    plan?: string; mode?: string; cycle?: string; return_url?: string;
  };
  if (plan !== 'starter' && plan !== 'pro') return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  if (mode !== 'flat' && mode !== 'usage')  return NextResponse.json({ error: 'Invalid billing mode' }, { status: 400 });
  if (cycle !== 'monthly' && cycle !== 'yearly') return NextResponse.json({ error: 'Invalid billing cycle' }, { status: 400 });

  const basePrice = basePriceEnv(plan, mode, cycle);
  if (!basePrice) {
    return NextResponse.json(
      { error: 'Billing isn’t configured yet — restaurant Stripe prices need to be set up.', code: 'prices_unconfigured' },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const rc = await getOrCreateRestaurantCustomer(stripe, supabase, user.id);
  if (!rc) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });

  // Trial end: if this location is still on its Pro trial, defer the first charge.
  const db = getServiceClient();
  const { data: rest } = await db
    .from('restaurants')
    .select('trial_ends_at, restaurant_tier')
    .eq('id', rc.restaurantId)
    .maybeSingle();
  const trialEndsAt = (rest as { trial_ends_at: string | null } | null)?.trial_ends_at;
  const trialEndUnix = trialEndsAt && new Date(trialEndsAt) > new Date()
    ? Math.floor(new Date(trialEndsAt).getTime() / 1000)
    : undefined;

  const lineItems: { price: string; quantity?: number }[] = [{ price: basePrice, quantity: 1 }];
  if (mode === 'usage') {
    const metered = meteredPriceEnv(plan);
    if (metered) lineItems.push({ price: metered }); // metered: no quantity
  }

  const base = return_url ?? `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/restaurant?tab=settings`;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: rc.customerId,
    line_items: lineItems,
    subscription_data: {
      ...(trialEndUnix ? { trial_end: trialEndUnix } : {}),
      metadata: { restaurant_id: rc.restaurantId, plan, billing_mode: mode, cycle },
    },
    metadata: { restaurant_id: rc.restaurantId, plan, billing_mode: mode, cycle },
    success_url: `${base}${base.includes('?') ? '&' : '?'}sub=success`,
    cancel_url: `${base}${base.includes('?') ? '&' : '?'}sub=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
