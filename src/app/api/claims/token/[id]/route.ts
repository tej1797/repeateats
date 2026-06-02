// GET /api/claims/token/[id] — generate a time-based dynamic QR token (60s window)
// Anti-scam: screenshot-sharing won't work because the QR value rotates every minute.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: { id: string } };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: claim, error: claimError } = await supabase
    .from('claims')
    .select('id, qr_code, status, expires_at, deal_id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (claimError || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  if (claim.status !== 'claimed') {
    return NextResponse.json({ error: 'Claim not active' }, { status: 400 });
  }

  if (claim.expires_at && new Date(claim.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Claim expired' }, { status: 410 });
  }

  // Generate time-based HMAC token (minute-precision window)
  const minute  = Math.floor(Date.now() / 60_000); // changes every 60s
  const payload = `${claim.id}:${claim.qr_code}:${minute}`;
  const secret  = process.env.QR_SECRET ?? 'repeateats-qr-secret-2026';

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBuf  = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigArr  = Array.from(new Uint8Array(sigBuf));
  const token   = btoa(sigArr.map(b => String.fromCharCode(b)).join(''))
    .replace(/[+/=]/g, '')
    .substring(0, 12)
    .toUpperCase();

  const dynamicCode = `${claim.qr_code}-${token}`;
  const validUntil  = (minute + 1) * 60_000; // end of current minute

  return NextResponse.json({
    code:             dynamicCode,
    qr_url:           `https://repeateats.ca/redeem/${dynamicCode}`,
    valid_until:      validUntil,
    claim_expires_at: claim.expires_at,
    seconds_left:     Math.max(0, Math.round((validUntil - Date.now()) / 1000)),
  });
}
