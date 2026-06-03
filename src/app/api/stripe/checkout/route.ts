// POST /api/stripe/checkout — create a Stripe Checkout session for RepEAT+
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  });

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* read-only in middleware */ }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as { plan?: string };
  const plan = body.plan ?? 'monthly';

  const priceMap: Record<string, string | undefined> = {
    // Legacy single-tier keys (kept for backwards compat)
    monthly:                 process.env.STRIPE_MONTHLY_PRICE_ID,
    three_monthly:           process.env.STRIPE_THREE_MONTHLY_PRICE_ID,
    yearly:                  process.env.STRIPE_YEARLY_PRICE_ID,
    // Starter tier
    starter_monthly:         process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    starter_three_monthly:   process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID,
    starter_yearly:          process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    // Pro tier
    pro_monthly:             process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_three_monthly:       process.env.STRIPE_PRO_THREE_MONTHLY_PRICE_ID,
    pro_yearly:              process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  };
  const priceId = priceMap[plan];

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or Stripe price ID not configured' }, { status: 400 });
  }

  // Get or create Stripe customer
  let stripeCustomerId: string;
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (userData?.stripe_customer_id) {
    stripeCustomerId = userData.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    stripeCustomerId = customer.id;
    await supabase
      .from('users')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', user.id);
  }

  // Apple Pay + Google Pay appear automatically on Stripe Hosted Checkout when:
  //   • "Apple Pay" is enabled in Dashboard → Settings → Payment methods → Apple Pay
  //     AND the domain is registered there (repeateats.ca).
  //   • "Google Pay" is enabled in Dashboard → Settings → Payment methods → Google Pay.
  // Both wallet buttons only appear on HTTPS (not localhost).
  //
  // Appearance: configure in Stripe Dashboard → Settings → Branding.
  // Hosted Checkout does not accept client-side appearance options via API.
  const session = await stripe.checkout.sessions.create({
    customer:                   stripeCustomerId,
    // Attach user IDs so /api/subscription/sync can locate the row without cookies
    client_reference_id:        user.id,
    metadata:                   { userId: user.id },
    mode:                       'subscription',
    payment_method_types:       ['card'],   // card includes Apple Pay + Google Pay when enabled
    payment_method_collection:  'always',   // collect card before trial — charged when trial ends
    line_items:                 [{ price: priceId, quantity: 1 }],
    subscription_data:          { trial_period_days: 3 },
    success_url:                `${process.env.NEXT_PUBLIC_SITE_URL}/repeat-plus/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:                 `${process.env.NEXT_PUBLIC_SITE_URL}/repeat-plus`,
    allow_promotion_codes:      true,
    billing_address_collection: 'required',
  });

  return NextResponse.json({ url: session.url });
}
