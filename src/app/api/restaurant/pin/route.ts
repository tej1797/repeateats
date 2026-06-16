// POST /api/restaurant/pin — set or change the restaurant's Owner or Manager PIN.
// Body: { kind: 'owner' | 'manager', pin: '######' }
// Canonical, server-side hashing shared by web AND mobile so a PIN set on one
// surface verifies on the other. The authenticated restaurant owner may set/reset
// at any time (this doubles as the "forgot PIN" recovery — no old PIN required).
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { resolveUser, getServiceClient } from '@/lib/stripeAuth';
import { hashPin } from '@/lib/pinHash';

export async function POST(request: NextRequest) {
  const { user } = await resolveUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { kind, pin } = await request.json().catch(() => ({})) as { kind?: string; pin?: string };
  if (kind !== 'owner' && kind !== 'manager') {
    return NextResponse.json({ error: 'kind must be "owner" or "manager"' }, { status: 400 });
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 6 digits' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: rest } = await db
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!rest) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });

  const column = kind === 'owner' ? 'owner_pin_hash' : 'manager_pin_hash';
  const hash = hashPin(pin, rest.id);

  const { error } = await db.from('restaurants').update({ [column]: hash }).eq('id', rest.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Return the hash so the web client can sync local state (the restaurant row
  // already carries these hashes client-side for instant unlock checks).
  return NextResponse.json({ ok: true, kind, hash });
}
