// POST /api/collabs/[id]/release — restaurant releases escrowed funds to the
// influencer. The creator receives net (amount − 0.5%); the restaurant already
// paid +0.5% at funding, so RepEAT keeps 1% total (0.5% from each side), which
// simply stays on the platform balance, untransferred.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getServiceClient } from '@/lib/stripeAuth';

const CREATOR_FEE_RATE = 0.005; // creator's 0.5% half

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const stripe = getStripe();
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getServiceClient();

  const { data: collab } = await db
    .from('collabs')
    .select('id, restaurant_id, influencer_id, agreed_amount, platform_fee_cents, payment_status, stripe_transfer_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!collab) return NextResponse.json({ error: 'Collab not found' }, { status: 404 });

  const { data: restaurant } = await db
    .from('restaurants')
    .select('id, owner_id')
    .eq('id', collab.restaurant_id)
    .maybeSingle();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your restaurant' }, { status: 403 });
  }

  if (collab.payment_status === 'released' || collab.stripe_transfer_id) {
    return NextResponse.json({ error: 'Funds already released' }, { status: 409 });
  }
  if (collab.payment_status !== 'escrowed') {
    return NextResponse.json({ error: 'Collab is not funded yet' }, { status: 409 });
  }

  const { data: inf } = await db
    .from('influencers')
    .select('id, stripe_account_id, payouts_enabled')
    .eq('id', collab.influencer_id)
    .maybeSingle();

  if (!inf?.stripe_account_id || !inf.payouts_enabled) {
    return NextResponse.json({ error: 'Creator has not finished payout setup' }, { status: 409 });
  }

  const amountCents     = Math.round((collab.agreed_amount ?? 0) * 100);
  // Creator's deduction is only their 0.5% half (the restaurant paid the other
  // half on top at funding). Do NOT subtract the stored total platform fee here.
  const creatorFeeCents = Math.round(amountCents * CREATOR_FEE_RATE);
  const netCents        = amountCents - creatorFeeCents;
  // Total platform take (both halves) for reporting.
  const feeCents        = collab.platform_fee_cents ?? Math.round(amountCents * (CREATOR_FEE_RATE * 2));
  if (netCents <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

  let transfer;
  try {
    transfer = await stripe.transfers.create({
      amount:         netCents,
      currency:       'cad',
      destination:    inf.stripe_account_id as string,
      transfer_group: `collab_${collab.id}`,
      metadata:       { collab_id: collab.id, kind: 'collab_payout' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Transfer failed';
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  await db.from('collabs').update({
    payment_status:     'released',
    stripe_transfer_id: transfer.id,
    released_at:        new Date().toISOString(),
    status:             'completed',
    updated_at:         new Date().toISOString(),
  }).eq('id', collab.id);

  return NextResponse.json({
    ok: true,
    payment_status: 'released',
    net_paid_cents: netCents,
    platform_fee_cents: feeCents,
  });
}
