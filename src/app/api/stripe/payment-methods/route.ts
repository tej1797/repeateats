// GET /api/stripe/payment-methods — list the signed-in user's saved Stripe payment methods.
// Returns lightweight, non-sensitive descriptors (brand, last4, type) — never raw card data.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser } from '@/lib/stripeAuth';

export async function GET(request: NextRequest) {
  const stripe = getStripe();
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only read the existing customer id — do NOT create one just to list (avoids
  // making empty customers when a restaurant has never added a method).
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  const customerId = userData?.stripe_customer_id as string | undefined;
  if (!customerId) return NextResponse.json({ methods: [], default_id: null });

  const customer = await stripe.customers.retrieve(customerId);
  const defaultId = (!customer.deleted && customer.invoice_settings?.default_payment_method)
    ? (typeof customer.invoice_settings.default_payment_method === 'string'
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings.default_payment_method.id)
    : null;

  const pms = await stripe.paymentMethods.list({ customer: customerId, limit: 20 });

  const methods = pms.data.map((pm) => ({
    id:    pm.id,
    type:  pm.type,
    card:  pm.card ? { brand: pm.card.brand, last4: pm.card.last4, exp_month: pm.card.exp_month, exp_year: pm.card.exp_year } : null,
    // Canadian pre-authorized debit (replaces manual bank-deposit fields)
    acss:  pm.acss_debit ? { bank_name: pm.acss_debit.bank_name, last4: pm.acss_debit.last4 } : null,
    is_default: pm.id === defaultId,
  }));

  return NextResponse.json({ methods, default_id: defaultId });
}
