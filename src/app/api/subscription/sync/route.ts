// POST /api/subscription/sync
// Called from the success page after Stripe checkout completes.
// Fetches the session from Stripe, resolves tier (starter/pro) from price ID,
// then writes plan fields to the users table.
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const STARTER_PRICE_IDS = new Set([
  process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
  process.env.STRIPE_STARTER_THREE_MONTHLY_PRICE_ID,
  process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
].filter(Boolean));

function resolveTier(priceId: string): 'starter' | 'pro' {
  return STARTER_PRICE_IDS.has(priceId) ? 'starter' : 'pro';
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  });

  // Auth via cookie-based server client
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

  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  // Fetch the Stripe session
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(body.session_id, {
      expand: ['subscription', 'customer'],
    });
  } catch {
    return NextResponse.json({ error: 'Invalid or expired session_id' }, { status: 404 });
  }

  // Guard: already processed (subscription is still active)
  if (session.payment_status === 'no_payment_required' || session.status === 'complete') {
    const sub = session.subscription as Stripe.Subscription | null;
    if (!sub) {
      return NextResponse.json({ error: 'No subscription on session' }, { status: 400 });
    }

    const priceId    = sub.items.data[0].price.id;
    const tier       = resolveTier(priceId);
    const status     = sub.status as string; // 'trialing' | 'active' | etc.
    const periodEnd  = (sub as unknown as Record<string, unknown>).current_period_end as number | undefined;
    const customerId = (session.customer as Stripe.Customer | null)?.id ?? session.customer as string;

    // Use service-role client for write (bypasses RLS)
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        is_repeat_plus:         true,
        repeat_plus_tier:       tier,
        plan_status:            status,
        stripe_customer_id:     customerId,
        stripe_subscription_id: sub.id,
        repeat_plus_since:      new Date().toISOString(),
        repeat_plus_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('sync update error:', updateError);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tier, status });
  }

  return NextResponse.json({ error: 'Session not complete' }, { status: 400 });
}
