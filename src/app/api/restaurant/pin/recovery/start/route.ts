// POST /api/restaurant/pin/recovery/start — email the restaurant owner a 6-digit
// OTP they can use to change a PIN when they've forgotten the current Owner PIN.
// The code goes to the OWNER's email (the authenticated account), so a manager
// holding the device can't complete recovery unless they also control that inbox.
// The returned OTP is verified server-side by POST /api/restaurant/pin (otp field).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveUser, getServiceClient } from '@/lib/stripeAuth';

export async function POST(request: NextRequest) {
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: 'No email on file for this account' }, { status: 400 });

  // Only restaurant owners can trigger PIN recovery.
  const db = getServiceClient();
  const { data: rest } = await db
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();
  if (!rest) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });

  // Send an email OTP via Supabase Auth (stateless client — no cookie side effects).
  const sender = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await sender.auth.signInWithOtp({
    email: user.email,
    options: { shouldCreateUser: false },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, email: user.email });
}
