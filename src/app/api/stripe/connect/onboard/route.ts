// POST /api/stripe/connect/onboard — create/continue an influencer's Stripe
// Connect Express account and return a hosted onboarding link.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, resolveUser, getServiceClient } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  try {
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

    const createAccount = async () => {
      const account = await stripe.accounts.create({
        type:          'express',
        country:       'CA',
        email:         user.email ?? undefined,
        business_type: 'individual',
        capabilities:  { transfers: { requested: true } },
        metadata:      { supabase_user_id: user.id, influencer_id: inf.id },
      });
      await db.from('influencers').update({ stripe_account_id: account.id }).eq('id', inf.id);
      return account.id;
    };

    if (!accountId) accountId = await createAccount();

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://repeateats.ca';
    const makeLink = (acct: string) => stripe.accountLinks.create({
      account:     acct,
      refresh_url: `${siteUrl}/influencer/profile?connect=refresh`,
      return_url:  `${siteUrl}/influencer/profile?connect=done`,
      type:        'account_onboarding',
    });

    let link;
    try {
      link = await makeLink(accountId);
    } catch (e) {
      // Stored account is invalid under the current key → recreate once.
      if (e instanceof Stripe.errors.StripeInvalidRequestError) {
        accountId = await createAccount();
        link = await makeLink(accountId);
      } else {
        throw e;
      }
    }

    return NextResponse.json({ url: link.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Could not start payout setup';
    // Surfaces "...Connect... not enabled" clearly so it's obvious Connect must be
    // turned on for this Stripe account, rather than a bare 500.
    return NextResponse.json({ error: msg, code: 'connect_onboard_failed' }, { status: 502 });
  }
}
