'use client';

// Standalone /restaurant/plans route — loads the owner's location, then renders
// the shared PlansPanel. The same panel also appears as the in-dashboard "Plans" tab.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import PlansPanel from '@/components/restaurant/PlansPanel';

const BG = '#0D0D0D';
const BG_CARD = '#161616';
const BORDER = 'rgba(255,255,255,0.1)';
const TEXT = '#F5F5F5';
const TEXT_MUTED = '#9A9A9A';

interface RestRow {
  id: string;
  restaurant_tier: string | null;
  billing_mode: string | null;
  trial_ends_at: string | null;
}

export default function RestaurantPlansPage() {
  const supabase = useRef(createClient()).current;
  const router = useRouter();
  const [rest, setRest]       = useState<RestRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.replace('/restaurant'); return; }
    const { data: r } = await supabase
      .from('restaurants')
      .select('id, restaurant_tier, billing_mode, trial_ends_at')
      .eq('owner_id', session.user.id)
      .maybeSingle();
    if (!r) { router.replace('/restaurant'); return; }
    setRest(r as RestRow);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { void load(); }, [load]);

  if (loading || !rest) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG, color: TEXT_MUTED }}>
        Loading plans…
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: BG, color: TEXT }}>
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 h-16 border-b" style={{ background: BG, borderColor: BORDER }}>
        <button onClick={() => router.push('/restaurant')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: BG_CARD }}>
          <IconArrowLeft size={18} />
        </button>
        <h1 className="font-display text-[17px] font-extrabold">RepEAT for Restaurants</h1>
      </div>
      <div className="px-4 pt-5">
        <PlansPanel
          restaurantId={rest.id}
          tier={rest.restaurant_tier}
          billingMode={rest.billing_mode}
          trialEndsAt={rest.trial_ends_at}
        />
      </div>
    </div>
  );
}
