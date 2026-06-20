// POST /api/collabs/[id]/fund — restaurant funds a finalized collab into escrow.
// Charges the restaurant owner's saved Stripe payment method; funds land on the
// platform balance (held) until released to the influencer.
// Body: { agreed_amount?: number (CAD dollars), payment_method_id?: string }
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getServiceClient } from '@/lib/stripeAuth';

// Even split: restaurant pays +0.5% on top, creator receives −0.5% at release.
// Platform keeps 1% total (0.5% from each side).
const RESTAURANT_FEE_RATE = 0.005;
const CREATOR_FEE_RATE    = 0.005;

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const stripe = getStripe();
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { agreed_amount?: number; payment_method_id?: string };
  const db = getServiceClient();

  // Load the collab + its restaurant; verify the caller owns that restaurant.
  const { data: collab } = await db
    .from('collabs')
    .select('id, restaurant_id, agreed_amount, payment_status, offer_amount_max, offer_amount_min')
    .eq('id', params.id)
    .maybeSingle();

  if (!collab) return NextResponse.json({ error: 'Collab not found' }, { status: 404 });

  const { data: restaurant } = await db
    .from('restaurants')
    .select('id, owner_id, name, owner_email, stripe_customer_id')
    .eq('id', collab.restaurant_id)
    .maybeSingle();

  if (!restaurant || restaurant.owner_id !== user.id) {
    return NextResponse.json({ error: 'Not your restaurant' }, { status: 403 });
  }

  if (collab.payment_status === 'escrowed' || collab.payment_status === 'released') {
    return NextResponse.json({ error: 'Collab is already funded' }, { status: 409 });
  }

  // Resolve the amount (CAD dollars). Prefer explicit body, then stored agreed_amount,
  // then fall back to the negotiated max offer.
  const amountDollars = body.agreed_amount ?? collab.agreed_amount ?? collab.offer_amount_max ?? collab.offer_amount_min;
  if (!amountDollars || amountDollars <= 0) {
    return NextResponse.json({ error: 'No agreed amount set for this collab' }, { status: 400 });
  }
  const amountCents       = Math.round(amountDollars * 100);
  const restaurantFeeCents = Math.round(amountCents * RESTAURANT_FEE_RATE);
  const creatorFeeCents    = Math.round(amountCents * CREATOR_FEE_RATE);
  // Restaurant is charged the agreed amount + its 0.5% half.
  const chargeCents = amountCents + restaurantFeeCents;
  // Stored fee = total platform take (both halves) for reporting.
  const feeCents    = restaurantFeeCents + creatorFeeCents;

  // Charge the RESTAURANT's Stripe customer (separate from the personal user
  // customer) — same customer the restaurant's payment-method routes use, so the
  // saved card added on web or the mobile app is the one charged here.
  let customerId = restaurant.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      name:     restaurant.name ?? undefined,
      email:    restaurant.owner_email ?? undefined,
      metadata: { restaurant_id: restaurant.id, owner_id: user.id, portal: 'restaurant' },
    });
    customerId = customer.id;
    await db.from('restaurants').update({ stripe_customer_id: customerId }).eq('id', restaurant.id);
  }

  let paymentMethodId = body.payment_method_id;
  if (!paymentMethodId) {
    const customer = await stripe.customers.retrieve(customerId);
    const def = !customer.deleted ? customer.invoice_settings?.default_payment_method : null;
    paymentMethodId = typeof def === 'string' ? def : def?.id;
    if (!paymentMethodId) {
      const list = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
      paymentMethodId = list.data[0]?.id;
    }
  }
  if (!paymentMethodId) {
    return NextResponse.json({ error: 'No saved payment method to charge' }, { status: 400 });
  }

  // Charge → funds held on platform balance (no destination/transfer here).
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount:         chargeCents,
      currency:       'cad',
      customer:       customerId,
      payment_method: paymentMethodId,
      off_session:    true,
      confirm:        true,
      transfer_group: `collab_${collab.id}`,
      metadata:       { collab_id: collab.id, restaurant_id: restaurant.id, kind: 'collab_escrow' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Card was declined';
    return NextResponse.json({ error: msg }, { status: 402 });
  }

  if (intent.status !== 'succeeded') {
    return NextResponse.json({ error: `Payment ${intent.status}`, requires_action: intent.status === 'requires_action' }, { status: 402 });
  }

  await db.from('collabs').update({
    agreed_amount:            amountDollars,
    platform_fee_cents:       feeCents,
    payment_status:           'escrowed',
    stripe_payment_intent_id: intent.id,
    stripe_payment_id:        intent.id,
    funded_at:                new Date().toISOString(),
    updated_at:               new Date().toISOString(),
  }).eq('id', collab.id);

  return NextResponse.json({
    ok: true,
    payment_status: 'escrowed',
    amount: amountDollars,
    platform_fee_cents: feeCents,
  });
}
