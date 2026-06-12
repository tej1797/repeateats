// POST /api/subscription/start-trial — opt-in 3-day Pro trial (no Stripe required)
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: started, error } = await supabase.rpc('start_customer_pro_trial', {
    p_user_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!started) {
    return NextResponse.json(
      { error: 'Trial already used or you have an active subscription.' },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true, tier: 'pro' });
}
