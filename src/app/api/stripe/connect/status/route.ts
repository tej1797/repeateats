// GET /api/stripe/connect/status — report the influencer's Connect onboarding state
// and sync the cached flags (stripe_onboarded, payouts_enabled).
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getServiceClient } from '@/lib/stripeAuth';

export async function GET(request: NextRequest) {
  try {
    const stripe = getStripe();
    const { user } = await resolveUser(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = getServiceClient();
    const { data: inf } = await db
      .from('influencers')
      .select('id, stripe_account_id, stripe_onboarded, payouts_enabled')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!inf) return NextResponse.json({ error: 'No creator profile found' }, { status: 404 });
    if (!inf.stripe_account_id) {
      return NextResponse.json({ connected: false, details_submitted: false, payouts_enabled: false });
    }

    // The stored account may not exist under the current Stripe key (e.g. after a
    // key/env switch). Treat any retrieve failure as "not connected" so the UI can
    // re-onboard instead of hard-crashing.
    let account;
    try {
      account = await stripe.accounts.retrieve(inf.stripe_account_id as string);
    } catch {
      await db.from('influencers')
        .update({ stripe_account_id: null, stripe_onboarded: false, payouts_enabled: false })
        .eq('id', inf.id);
      return NextResponse.json({ connected: false, details_submitted: false, payouts_enabled: false, reset: true });
    }

    const detailsSubmitted = account.details_submitted ?? false;
    const payoutsEnabled   = account.payouts_enabled ?? false;

    if (detailsSubmitted !== inf.stripe_onboarded || payoutsEnabled !== inf.payouts_enabled) {
      await db.from('influencers')
        .update({ stripe_onboarded: detailsSubmitted, payouts_enabled: payoutsEnabled })
        .eq('id', inf.id);
    }

    return NextResponse.json({
      connected:         true,
      details_submitted: detailsSubmitted,
      payouts_enabled:   payoutsEnabled,
      charges_enabled:   account.charges_enabled ?? false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not load payout status';
    return NextResponse.json({ error: msg, code: 'connect_status_failed' }, { status: 502 });
  }
}
