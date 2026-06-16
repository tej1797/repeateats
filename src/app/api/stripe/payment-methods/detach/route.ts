// POST /api/stripe/payment-methods/detach — remove a saved payment method.
// Body: { payment_method_id, context?: 'restaurant'|'customer' }
// Verifies the method belongs to the caller's customer for the given portal.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getOwnedRestaurant } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { payment_method_id, context } = await request.json().catch(() => ({})) as {
    payment_method_id?: string;
    context?: 'restaurant' | 'customer';
  };
  if (!payment_method_id) return NextResponse.json({ error: 'Missing payment_method_id' }, { status: 400 });

  let customerId: string | undefined;
  if (context === 'restaurant') {
    const rest = await getOwnedRestaurant(supabase, user.id);
    customerId = rest?.stripe_customer_id ?? undefined;
  } else {
    const { data: userData } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    customerId = userData?.stripe_customer_id as string | undefined;
  }

  if (!customerId) return NextResponse.json({ error: 'No customer' }, { status: 404 });

  // Ownership guard: confirm the PM is attached to THIS customer before detaching.
  const pm = await stripe.paymentMethods.retrieve(payment_method_id);
  if (pm.customer !== customerId) {
    return NextResponse.json({ error: 'Not your payment method' }, { status: 403 });
  }

  await stripe.paymentMethods.detach(payment_method_id);
  return NextResponse.json({ ok: true });
}
