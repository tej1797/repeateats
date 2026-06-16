// Shared Stripe + Supabase auth helpers for API routes.
// Resolves the signed-in user from either a Bearer JWT (mobile / fetch with token)
// or the Supabase auth cookie (web SSR), then get-or-creates a Stripe Customer.
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

// Keep this in sync with the version used elsewhere (checkout/portal routes).
export const STRIPE_API_VERSION = '2026-05-27.dahlia' as const;

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION });
}

export interface ResolvedUser {
  user: User | null;
  supabase: SupabaseClient;
}

/**
 * Resolve the current user. Works for both mobile (Authorization: Bearer <jwt>)
 * and web (Supabase auth cookie). Mirrors the pattern in /api/stripe/checkout.
 */
export async function resolveUser(request: NextRequest): Promise<ResolvedUser> {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const jwt = authHeader.slice(7);
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user }, error } = await admin.auth.getUser(jwt);
    if (!error && user) return { user, supabase: admin };
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch { /* read-only in middleware */ }
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return { user, supabase };
}

/**
 * Return the user's Stripe customer id, creating (and persisting) one if absent.
 * Uses the service-role client for the write so it works regardless of RLS.
 */
export async function getOrCreateCustomer(
  stripe: Stripe,
  supabase: SupabaseClient,
  user: User,
): Promise<string> {
  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (userData?.stripe_customer_id) return userData.stripe_customer_id as string;

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: { supabase_user_id: user.id },
  });

  await supabase
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', user.id);

  return customer.id;
}

/** Service-role Supabase client for privileged writes (webhooks, transfers). */
export function getServiceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}
