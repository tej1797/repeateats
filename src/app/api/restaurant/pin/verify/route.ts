// POST /api/restaurant/pin/verify — verify an Owner or Manager PIN.
// Body: { kind: 'owner' | 'manager', pin: '######' }
// Returns { valid, is_set }. Same canonical hashing as the set route, so web and
// mobile agree. Used by both surfaces to gate payment methods, manager mode, etc.
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
  const column = kind === 'owner' ? 'owner_pin_hash' : 'manager_pin_hash';
  const { data: rest } = await db
    .from('restaurants')
    .select(`id, ${column}`)
    .eq('owner_id', user.id)
    .maybeSingle();

  if (!rest) return NextResponse.json({ error: 'No restaurant found for this account' }, { status: 404 });

  const stored = (rest as Record<string, unknown>)[column] as string | null;
  const valid = !!stored && hashPin(pin, (rest as { id: string }).id) === stored;

  return NextResponse.json({ valid, is_set: !!stored });
}
