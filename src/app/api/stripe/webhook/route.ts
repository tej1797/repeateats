// POST /api/stripe/webhook — handle Stripe subscription lifecycle events
// This is the reliable fallback sync: runs server-side regardless of whether
// the browser reaches the success page. Register this URL in Stripe Dashboard →
// Developers → Webhooks → Add endpoint: https://repeateats.ca/api/stripe/webhook
// Events to listen for: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted, invoice.payment_failed
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // required for request.text()

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const STARTER_PRICE_IDS = new Set(
  [
    process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID,
    process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  ].filter(Boolean),
);

function resolveTier(priceId: string): 'starter' | 'pro' {
  return STARTER_PRICE_IDS.has(priceId) ? 'starter' : 'pro';
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const body = await request.text();
  const sig  = request.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session        = event.data.object as Stripe.Checkout.Session;
      const customerId     = session.customer as string;
      const subscriptionId = session.subscription as string;
      if (!subscriptionId) break;

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub          = subscription as unknown as Record<string, any>;
      const priceId      = subscription.items.data[0].price.id;
      const tier         = resolveTier(priceId);
      // Billing-cycle label kept for backwards compat
      const billingCycle = priceId === process.env.STRIPE_YEARLY_PRICE_ID
        ? 'yearly'
        : (priceId === process.env.STRIPE_THREE_MONTHLY_PRICE_ID ||
           priceId === process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID ||
           priceId === process.env.STRIPE_PRO_THREE_MONTHLY_PRICE_ID)
        ? 'three_monthly'
        : 'monthly';
      const periodEnd = sub.current_period_end as number | undefined;

      const { error: wErr } = await supabase.from('users').update({
        is_repeat_plus:         true,
        repeat_plus_tier:       tier,
        stripe_subscription_id: subscriptionId,
        repeat_plus_plan:       billingCycle,
        repeat_plus_since:      new Date().toISOString(),
        repeat_plus_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      }).eq('stripe_customer_id', customerId);

      if (wErr) console.error('[webhook] checkout.session.completed DB error:', JSON.stringify(wErr));
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId   = subscription.customer as string;
      const isActive     = ['active', 'trialing'].includes(subscription.status);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub          = subscription as unknown as Record<string, any>;
      const periodEnd    = sub.current_period_end as number | undefined;
      const priceId      = subscription.items.data[0]?.price?.id ?? '';
      const tier         = resolveTier(priceId);

      const { error: wErr } = await supabase.from('users').update({
        is_repeat_plus:         isActive,
        repeat_plus_tier:       isActive ? tier : 'free',
        repeat_plus_expires_at: isActive && periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      }).eq('stripe_customer_id', customerId);

      if (wErr) console.error('[webhook] subscription.updated DB error:', JSON.stringify(wErr));
      break;
    }

    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const { error: wErr } = await supabase.from('users').update({
        is_repeat_plus:   false,
        repeat_plus_tier: 'free',
      }).eq('stripe_customer_id', customerId);
      if (wErr) console.error('[webhook] invoice.payment_failed DB error:', JSON.stringify(wErr));
      break;
    }
  }

  return NextResponse.json({ received: true });
}
