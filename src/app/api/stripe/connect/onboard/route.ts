// POST /api/stripe/connect/onboard — create/continue an influencer's Stripe
// Connect Express account and return a hosted onboarding link.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getServiceClient } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceClient();

  // The caller must own an influencer profile.
  const { data: inf } = await db
    .from('influencers')
    .select('id, user_id, stripe_account_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!inf) return NextResponse.json({ error: 'No creator profile found' }, { status: 404 });

  let accountId = inf.stripe_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type:          'express',
      country:       'CA',
      email:         user.email ?? undefined,
      business_type: 'individual',
      capabilities:  { transfers: { requested: true } },
      metadata:      { supabase_user_id: user.id, influencer_id: inf.id },
    });
    accountId = account.id;
    await db.from('influencers').update({ stripe_account_id: accountId }).eq('id', inf.id);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://repeateats.ca';
  const link = await stripe.accountLinks.create({
    account:     accountId,
    refresh_url: `${siteUrl}/influencer/profile?connect=refresh`,
    return_url:  `${siteUrl}/influencer/profile?connect=done`,
    type:        'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}
