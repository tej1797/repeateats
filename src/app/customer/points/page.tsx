'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconStar } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCustomerPoints } from '@/hooks/useCustomerPoints';
import { usePlan } from '@/hooks/usePlan';
import { CUSTOMER_UI, METALLIC_GOLD } from '@/lib/customerUI';
import MobileNav from '@/components/layout/MobileNav';

export default function CustomerPointsPage() {
  const router   = useRouter();
  const plan     = usePlan();
  const points   = useCustomerPoints(plan.tier);
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/customer/login');
      else setAuthed(true);
    });
  }, [router]);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CUSTOMER_UI.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CUSTOMER_UI.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: CUSTOMER_UI.bg, color: CUSTOMER_UI.textPrimary }}>
      <header className="sticky top-0 z-30 px-5 py-4 flex items-center gap-3 border-b" style={{ borderColor: CUSTOMER_UI.glassBorder, background: CUSTOMER_UI.bgElevated }}>
        <button onClick={() => router.back()} className="p-1" aria-label="Back">
          <IconArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-[18px] font-bold">Rewards</h1>
          <p className="text-[12px]" style={{ color: CUSTOMER_UI.textSecondary }}>
            <IconStar size={12} className="inline mr-1" style={{ color: CUSTOMER_UI.gold }} />
            {points.balance} points available
          </p>
        </div>
      </header>

      <main className="px-5 py-5">
        <p className="text-[13px] mb-4" style={{ color: CUSTOMER_UI.textSecondary }}>
          Earn 10 pts per scan · 50 pts signup bonus · Redeem for extra redemptions &amp; Pro extensions
        </p>

        {points.error && (
          <p className="text-[13px] mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5' }}>
            {points.error}
          </p>
        )}

        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 -mx-5 px-5">
          {points.rewards.map(reward => {
            const canAfford = points.balance >= reward.cost;
            const isLoading = points.redeeming === reward.key;
            return (
              <div
                key={reward.key}
                className="flex-shrink-0 w-[160px] p-4 rounded-2xl border"
                style={{
                  background: CUSTOMER_UI.glassBg,
                  borderColor: CUSTOMER_UI.glassBorder,
                }}
              >
                <p className="text-[22px] font-bold mb-1" style={{ color: CUSTOMER_UI.gold }}>
                  {reward.cost}
                  <span className="text-[11px] font-semibold ml-1" style={{ color: CUSTOMER_UI.textMuted }}>pts</span>
                </p>
                <p className="text-[13px] font-bold leading-snug mb-1">{reward.title}</p>
                <p className="text-[11px] mb-3 leading-relaxed" style={{ color: CUSTOMER_UI.textSecondary }}>
                  {reward.description}
                </p>
                <button
                  disabled={!canAfford || isLoading}
                  onClick={() => void points.redeemReward(reward.key)}
                  className="w-full h-8 rounded-xl text-[12px] font-bold transition-opacity disabled:opacity-40"
                  style={{
                    background: canAfford ? METALLIC_GOLD.gradient : 'rgba(255,255,255,0.08)',
                    color: canAfford ? '#1a1100' : CUSTOMER_UI.textMuted,
                  }}
                >
                  {isLoading ? 'Redeeming…' : canAfford ? 'Redeem' : 'Need more pts'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-8 p-4 rounded-2xl border" style={{ background: CUSTOMER_UI.glassBg, borderColor: CUSTOMER_UI.glassBorder }}>
          <p className="text-[14px] font-bold mb-2">How to earn</p>
          <ul className="text-[13px] space-y-1.5" style={{ color: CUSTOMER_UI.textSecondary }}>
            <li>+50 pts — Sign up bonus</li>
            <li>+10 pts — Each QR scan redemption</li>
            <li>+15 pts — First scan bonus (one-time)</li>
          </ul>
          <Link href="/repeat-plus" className="inline-block mt-3 text-[13px] font-semibold" style={{ color: CUSTOMER_UI.accent }}>
            Upgrade to RepEAT+ →
          </Link>
        </div>
      </main>

      <MobileNav portal="customer" />
    </div>
  );
}
