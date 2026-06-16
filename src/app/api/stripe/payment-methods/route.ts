// GET /api/stripe/payment-methods?context=restaurant|customer
// Lists the saved Stripe payment methods for the requested portal context.
//   - context=restaurant → the restaurant the caller owns (restaurants.stripe_customer_id)
//   - context=customer    → the personal user customer (users.stripe_customer_id)
// Same email + different portal = different Stripe customer, so web and mobile
// share one store per portal. Returns lightweight descriptors only.
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe, resolveUser, getOwnedRestaurant } from '@/lib/stripeAuth';

export async function GET(request: NextRequest) {
  const stripe = getStripe();
  const { user, supabase } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const context = request.nextUrl.searchParams.get('context') === 'restaurant' ? 'restaurant' : 'customer';

  // Resolve the existing customer id WITHOUT creating one (avoids empty customers).
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
    acss:  pm.acss_debit ? { bank_name: pm.acss_debit.bank_name, last4: pm.acss_debit.last4 } : null,
    is_default: pm.id === defaultId,
  }));

  return NextResponse.json({ methods, default_id: defaultId });
}
