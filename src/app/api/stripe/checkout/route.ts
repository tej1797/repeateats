// POST /api/stripe/checkout — create a Stripe Checkout session for RepEAT+
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { resolveCheckoutPriceKey } from '@/lib/stripeTier';

async function resolveUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (!error && user) return { user, supabase: admin };
  }

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
  return { user, supabase };
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  });

  const { user, supabase } = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json() as {
    plan?: string;
    billing_interval?: string;
    success_url?: string;
    cancel_url?: string;
    user_id?: string;
  };

  const priceKey = resolveCheckoutPriceKey(body);
  const priceMap: Record<string, string | undefined> = {
    monthly:               process.env.STRIPE_MONTHLY_PRICE_ID,
    three_monthly:         process.env.STRIPE_THREE_MONTHLY_PRICE_ID,
    yearly:                process.env.STRIPE_YEARLY_PRICE_ID,
    starter_monthly:       process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    starter_three_monthly: process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID,
    starter_yearly:        process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
    pro_monthly:           process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    pro_three_monthly:     process.env.STRIPE_PRO_THREE_MONTHLY_PRICE_ID,
    pro_yearly:            process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  };

  const priceId = priceKey ? priceMap[priceKey] : undefined;

  if (!priceId) {
    return NextResponse.json({ error: 'Invalid plan or Stripe price ID not configured' }, { status: 400 });
  }

  let stripeCustomerId: string;
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id, repeat_plus_trial_used')
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://repeateats.ca';
  const successUrl = body.success_url ?? `${siteUrl}/repeat-plus/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = body.cancel_url  ?? `${siteUrl}/repeat-plus`;

  const session = await stripe.checkout.sessions.create({
    customer:                   stripeCustomerId,
    client_reference_id:        user.id,
    metadata:                   { userId: user.id },
    mode:                       'subscription',
    payment_method_types:       ['card'],
    payment_method_collection:  'always',
    line_items:                 [{ price: priceId, quantity: 1 }],
    subscription_data:          { trial_period_days: 3 },
    success_url:                successUrl,
    cancel_url:                 cancelUrl,
    allow_promotion_codes:      true,
    billing_address_collection: 'required',
  });

  return NextResponse.json({ url: session.url });
}
