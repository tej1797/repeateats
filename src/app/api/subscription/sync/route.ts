// POST /api/subscription/sync
// Called from the success page. Fetches the Stripe session, resolves tier,
// enforces Canada-only, then writes plan fields to the users table.
//
// If this returns 500 "DB update failed" check Vercel function logs for
// the exact Supabase error — most likely a missing column. Run this migration:
//
//   ALTER TABLE users
//     ADD COLUMN IF NOT EXISTS repeat_plus_tier text DEFAULT 'free',
//     ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
//
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
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
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-05-27.dahlia',
  });

  // ── Auth: identify the user from session cookie ───────────────────────────
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: { session_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.session_id) {
    return NextResponse.json({ error: 'session_id required' }, { status: 400 });
  }

  // ── Fetch Stripe session ──────────────────────────────────────────────────
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

  // ── Canada-only gate ──────────────────────────────────────────────────────
  const country = session.customer_details?.address?.country;
  if (country && country !== 'CA') {
    try {
      await stripe.subscriptions.cancel(sub.id);
    } catch (err) {
      console.error('[sync] Failed to cancel non-CA subscription:', err);
    }
    return NextResponse.json(
      { error: 'RepEAT is currently only available in Canada. Your subscription has been cancelled and you will not be charged.' },
      { status: 403 },
    );
  }

  // ── Resolve plan tier + metadata ─────────────────────────────────────────
  const priceId    = sub.items.data[0]?.price?.id ?? '';
  const tier       = resolveTier(priceId);
  const subStatus  = sub.status;                          // 'trialing' | 'active' | …
  const periodEnd  = (sub as unknown as { current_period_end: number }).current_period_end;
  const customerId =
    (session.customer as Stripe.Customer | null)?.id ??
    (session.customer as string | null) ??
    null;

  // Determine user ID: prefer authenticated session, fall back to metadata/client_reference_id
  const userId =
    user?.id ??
    (session.metadata?.userId as string | undefined) ??
    session.client_reference_id ??
    null;

  if (!userId) {
    console.error('[sync] Could not identify user — no auth cookie, no metadata.userId, no client_reference_id');
    return NextResponse.json({ error: 'Cannot identify user. Please log in and try again.' }, { status: 401 });
  }

  // ── DB write — service-role bypasses RLS ──────────────────────────────────
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Only write columns that exist in the current schema.
  // plan_status is intentionally omitted — the column doesn't exist yet.
  // To add it: ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_status text;
  const updatePayload: Record<string, unknown> = {
    is_repeat_plus:         true,
    repeat_plus_tier:       tier,                 // 'starter' | 'pro'
    stripe_customer_id:     customerId,
    stripe_subscription_id: sub.id,
    repeat_plus_since:      new Date().toISOString(),
    repeat_plus_expires_at: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  const { error: dbError } = await admin
    .from('users')
    .update(updatePayload)
    .eq('id', userId);

  if (dbError) {
    // Log the full error object so the Vercel log shows exactly which column is missing
    console.error('[sync] DB update failed — userId:', userId, '| error:', JSON.stringify(dbError));
    return NextResponse.json(
      { error: 'DB update failed', detail: dbError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, tier, status: subStatus });
}
