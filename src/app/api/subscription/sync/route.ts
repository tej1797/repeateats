// POST /api/subscription/sync — success-page fallback tier sync
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { resolveBillingPlan, resolveStripeTier } from '@/lib/stripeTier';

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
          } catch { /* read-only */ }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(body.session_id, {
      expand: ['subscription', 'customer'],
    });
  } catch (err) {
    console.error('[sync] Stripe session retrieve failed:', err);
    return NextResponse.json({ error: 'Invalid or expired session_id' }, { status: 404 });
  }

  if (session.status !== 'complete') {
    return NextResponse.json({ error: 'Session not complete' }, { status: 400 });
  }

  const sub = session.subscription as Stripe.Subscription | null;
  if (!sub) {
    return NextResponse.json({ error: 'No subscription on session' }, { status: 400 });
  }

  const country = session.customer_details?.address?.country;
  if (country && country !== 'CA') {
    try { await stripe.subscriptions.cancel(sub.id); } catch (err) {
      console.error('[sync] Failed to cancel non-CA subscription:', err);
    }
    return NextResponse.json(
      { error: 'RepEAT is currently only available in Canada.' },
      { status: 403 },
    );
  }

  const priceId    = sub.items.data[0]?.price?.id ?? '';
  const tier       = resolveStripeTier(priceId);
  const billingCycle = resolveBillingPlan(priceId);
  const periodEnd  = (sub as unknown as { current_period_end: number }).current_period_end;
  const customerId =
    (session.customer as Stripe.Customer | null)?.id ??
    (session.customer as string | null) ??
    null;

  const userId =
    user?.id ??
    (session.metadata?.userId as string | undefined) ??
    session.client_reference_id ??
    null;

  if (!userId) {
    return NextResponse.json({ error: 'Cannot identify user' }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { error: dbError } = await admin
    .from('users')
    .update({
      repeat_plus_tier:       tier,
      repeat_plus_plan:       billingCycle,
      stripe_customer_id:     customerId,
      stripe_subscription_id: sub.id,
      repeat_plus_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('id', userId);

  if (dbError) {
    console.error('[sync] DB update failed:', JSON.stringify(dbError));
    return NextResponse.json({ error: 'DB update failed', detail: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tier, status: sub.status });
}
