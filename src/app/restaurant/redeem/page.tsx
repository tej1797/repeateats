'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconLayoutGrid } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import ScannerPanel from '@/components/restaurant/ScannerPanel';

const BLUE = '#1249A9';

export default function RedeemPage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [authChecked,  setAuthChecked]  = useState(false);
  const [authed,       setAuthed]       = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/restaurant');
        return;
      }
      setAuthed(true);
      setAuthChecked(true);
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', session.user.id)
        .maybeSingle();
      if (rest?.id) setRestaurantId(rest.id);
    });
  }, [supabase, router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#0C0A09] flex items-center justify-center">
        <div
          className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin"
          style={{ borderColor: `${BLUE}33`, borderTopColor: BLUE }}
        />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[#0C0A09]">
      <header className="sticky top-0 z-10 bg-[#0C0A09] border-b border-[#222]">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <div className="font-display text-[18px] font-extrabold leading-none">
              Rep<span className="text-brand">EAT</span>
            </div>
            <div className="text-[11px] text-[#666] mt-0.5">Scan QR</div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/restaurant"
              className="text-[12px] text-[#888] hover:text-white transition-colors flex items-center gap-1"
            >
              <IconArrowLeft size={14} /> Dashboard
            </Link>
            <Link href="/restaurant" className="text-[#666] hover:text-white transition-colors">
              <IconLayoutGrid size={18} />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <ScannerPanel restaurantId={restaurantId} />
      </main>
    </div>
  );
}
