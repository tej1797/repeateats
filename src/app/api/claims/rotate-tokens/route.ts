// POST /api/claims/rotate-tokens
// Called by Vercel Cron every 5 minutes.
// Rotates qr_token_current → qr_token_previous for all active claims,
// then issues a fresh token. Previous token stays valid for 5-minute
// grace period so a scan mid-rotation still works.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ''}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const { error } = await supabase.rpc('rotate_qr_tokens');

  if (error) {
    console.error('rotate_qr_tokens error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
