// POST /api/restaurant/pin — set or change the restaurant's Owner or Manager PIN.
// Body: { kind: 'owner' | 'manager', pin: '######', current_pin?: '######', otp?: '######' }
//
// Security: once an Owner PIN exists, changing EITHER the Owner or the Manager PIN
// requires proof of ownership — the current Owner PIN, or an email OTP sent to the
// owner's address (see ./recovery/start). This prevents a manager (who only knows
// the manager PIN but holds the unlocked, owner-authenticated device) from silently
// taking over the Owner PIN / unlocking payments / disabling manager mode.
// First-time setup (no Owner PIN yet) stays open — there is nothing to protect.
//
// Canonical, server-side hashing shared by web AND mobile so a PIN set on one
// surface verifies on the other.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveUser, getServiceClient } from '@/lib/stripeAuth';
import { hashPin } from '@/lib/pinHash';

/** Verify an email OTP against the owner's address. Uses a stateless anon client
 *  so it never touches the caller's session cookies. Returns true if valid. */
async function verifyOwnerOtp(email: string, token: string): Promise<boolean> {
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error } = await verifier.auth.verifyOtp({ email, token, type: 'email' });
  return !error;
}

export async function POST(request: NextRequest) {
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { kind, pin, current_pin, otp } = await request.json().catch(() => ({})) as {
    kind?: string; pin?: string; current_pin?: string; otp?: string;
  };
  if (kind !== 'owner' && kind !== 'manager') {
    return NextResponse.json({ error: 'kind must be "owner" or "manager"' }, { status: 400 });
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: rest } = await db
    .from('restaurants')
    .select('id, owner_pin_hash')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!rest) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });

  const ownerHash = (rest as { owner_pin_hash: string | null }).owner_pin_hash;

  // Once an Owner PIN exists, any PIN change (owner OR manager) must prove ownership.
  if (ownerHash) {
    let proven = false;

    if (current_pin && /^\d{6}$/.test(current_pin)) {
      proven = hashPin(current_pin, rest.id) === ownerHash;
      if (!proven) {
        return NextResponse.json(
          { error: 'Current Owner PIN is incorrect', code: 'bad_current_pin' },
          { status: 403 },
        );
      }
    } else if (otp && user.email) {
      proven = await verifyOwnerOtp(user.email, otp);
      if (!proven) {
        return NextResponse.json(
          { error: 'Verification code is invalid or expired', code: 'bad_otp' },
          { status: 403 },
        );
      }
    }

    if (!proven) {
      return NextResponse.json(
        { error: 'Owner verification required to change a PIN', code: 'proof_required' },
        { status: 403 },
      );
    }
  }

  const column = kind === 'owner' ? 'owner_pin_hash' : 'manager_pin_hash';
  const hash = hashPin(pin, rest.id);

  const { error } = await db.from('restaurants').update({ [column]: hash }).eq('id', rest.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the hash so the web client can sync local state (the restaurant row
  // already carries these hashes client-side for instant unlock checks).
  return NextResponse.json({ ok: true, kind, hash });
}
