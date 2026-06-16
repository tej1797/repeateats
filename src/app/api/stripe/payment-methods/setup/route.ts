// POST /api/stripe/payment-methods/setup — create a Stripe-hosted Checkout session
// in `setup` mode so the user can securely add a reusable payment method.
// Body: { context?: 'restaurant'|'customer', method?: 'card'|'acss_debit', return_url? }
// We never touch raw card/bank data; Stripe collects and stores it.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getOrCreateCustomer, getOrCreateRestaurantCustomer } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    return_url?: string;
    method?: 'card' | 'acss_debit';
    context?: 'restaurant' | 'customer';
  };

  // Resolve the customer for the requested portal context.
  let customerId: string;
  if (body.context === 'restaurant') {
    const r = await getOrCreateRestaurantCustomer(stripe, supabase, user.id);
    if (!r) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });
    customerId = r.customerId;
  } else {
    customerId = await getOrCreateCustomer(stripe, supabase, user);
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://repeateats.ca';
  const returnUrl = body.return_url ?? `${siteUrl}/restaurant?tab=settings`;

  // 'card' covers Apple Pay & Google Pay automatically on Stripe's hosted page.
  const paymentMethodTypes: ('card' | 'acss_debit')[] =
    body.method === 'acss_debit' ? ['acss_debit'] : ['card'];

  const session = await stripe.checkout.sessions.create({
    mode:                 'setup',
    customer:             customerId,
    payment_method_types: paymentMethodTypes,
    success_url: `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}pm_added=1`,
    cancel_url:  returnUrl,
    ...(body.method === 'acss_debit'
      ? { payment_method_options: { acss_debit: { currency: 'cad', mandate_options: { payment_schedule: 'sporadic', transaction_type: 'business' } } } }
      : {}),
  });

  return NextResponse.json({ url: session.url });
}
