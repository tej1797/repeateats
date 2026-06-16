// POST /api/stripe/payment-methods/detach — remove a saved payment method.
// Body: { payment_method_id }. Verifies the method belongs to the caller's customer.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { payment_method_id } = await request.json().catch(() => ({})) as { payment_method_id?: string };
  if (!payment_method_id) return NextResponse.json({ error: 'Missing payment_method_id' }, { status: 400 });

  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = userData?.stripe_customer_id as string | undefined;
  if (!customerId) return NextResponse.json({ error: 'No customer' }, { status: 404 });

  // Ownership guard: confirm the PM is attached to THIS customer before detaching.
  const pm = await stripe.paymentMethods.retrieve(payment_method_id);
  if (pm.customer !== customerId) {
    return NextResponse.json({ error: 'Not your payment method' }, { status: 403 });
  }

  await stripe.paymentMethods.detach(payment_method_id);
  return NextResponse.json({ ok: true });
}
