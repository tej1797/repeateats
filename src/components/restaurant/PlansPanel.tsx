'use client';

// Restaurant plans & pricing content — reused by the standalone /restaurant/plans
// route AND the in-dashboard "Plans" tab. Self-fetches the location's usage.

import { useState, useEffect, useRef, useCallback } from 'react';
import { IconCircleCheck, IconBolt } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import {
  planMonthlyPrice, PLAN_FEATURES, USAGE_FREE_REDEMPTIONS, USAGE_OVERAGE_CENTS,
  type BillingMode, type BillingCycle,
} from '@/lib/restaurantPlans';

const BRAND      = '#1249A9';
const BG_CARD    = '#161616';
const BORDER     = 'rgba(255,255,255,0.1)';
const TEXT       = '#F5F5F5';
const TEXT_MUTED = '#9A9A9A';

interface PlansPanelProps {
  restaurantId: string;
  tier: string | null;
  billingMode: string | null;
  trialEndsAt: string | null;
}

export default function PlansPanel({ restaurantId, tier, billingMode, trialEndsAt }: PlansPanelProps) {
  const supabase = useRef(createClient()).current;
  const [usage, setUsage]     = useState(0);
  const [metered, setMetered] = useState(0);
  const [mode, setMode]       = useState<BillingMode>(billingMode === 'usage' ? 'usage' : 'flat');
  const [cycle, setCycle]     = useState<BillingCycle>('monthly');
  const [busy, setBusy]       = useState<string | null>(null);
  const [error, setError]     = useState('');

  const loadUsage = useCallback(async () => {
    const monthKey = new Date().toISOString().slice(0, 7); // 'YYYY-MM' (UTC)
    const { data } = await supabase
      .from('restaurant_billing_usage')
      .select('billable_redemptions, metered_redemptions')
      .eq('restaurant_id', restaurantId)
      .eq('month_key', monthKey)
      .maybeSingle();
    const u = data as { billable_redemptions: number; metered_redemptions: number } | null;
    setUsage(u?.billable_redemptions ?? 0);
    setMetered(u?.metered_redemptions ?? 0);
  }, [supabase, restaurantId]);

  useEffect(() => { void loadUsage(); }, [loadUsage]);

  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;
  const onTrial = tier === 'trial' && trialDaysLeft > 0;
  const trialEndLabel = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  const subscribe = async (plan: 'starter' | 'pro') => {
    setBusy(plan); setError('');
    try {
      const planParam = cycle === 'yearly' ? `${plan}_yearly` : plan;
      const returnBase = `${window.location.origin}/restaurant?tab=settings`;
      const { data, error: fnErr } = await supabase.functions.invoke('restaurant-stripe', {
        body: {
          action: 'checkout',
          restaurant_id: restaurantId,
          plan: planParam,
          billing_mode: mode === 'flat' ? 'subscription_only' : 'subscription_plus_metering',
          billing_interval: cycle === 'yearly' ? 'year' : 'month',
          success_url: `${returnBase}&sub=success`,
          cancel_url: `${returnBase}&sub=cancelled`,
        },
      });
      if (fnErr) {
        // FunctionsHttpError carries the real response body in .context — surface it.
        let detail = fnErr.message;
        try {
          const ctx = (fnErr as { context?: Response }).context;
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json() as { error?: string; message?: string };
            detail = body.error ?? body.message ?? detail;
          }
        } catch { /* keep generic message */ }
        throw new Error(detail || 'Could not start checkout');
      }
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('Could not start checkout');
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(null);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto space-y-5">
      {/* Hero / trial banner */}
      <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${BRAND}, #0E3A86)`, color: TEXT }}>
        <h2 className="font-display text-[28px] font-extrabold leading-tight">Grow with RepEAT</h2>
        <p className="text-[14px] mt-2" style={{ color: 'rgba(255,255,255,0.85)' }}>
          Attract diners with deals. Billing is per restaurant location — not per owner account.
        </p>
        {onTrial && (
          <div className="rounded-xl px-4 py-3 mt-4 text-[14px] font-semibold" style={{ background: 'rgba(255,255,255,0.14)' }}>
            {trialDaysLeft} days left on your free Pro trial — full Pro access, CA$0 due.
          </div>
        )}
        <p className="text-[13px] font-bold uppercase tracking-wide mt-4" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Current plan: {(tier === 'trial' ? 'PRO TRIAL' : tier ?? 'free').toUpperCase()}
        </p>
      </div>

      <p className="text-[14px] font-semibold" style={{ color: TEXT }}>
        Choose flat monthly or monthly + usage below. Card is saved now — first charge when your trial ends.
      </p>
      {trialEndLabel && (
        <p className="text-[13px]" style={{ color: '#5B9BD5' }}>
          No charge until {trialEndLabel}. Your paid plan starts when the trial ends — otherwise this location moves to Free.
        </p>
      )}

      {/* Billing mode */}
      <div>
        <h3 className="text-[15px] font-bold mb-2" style={{ color: TEXT }}>How you want to pay</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {([
            { id: 'flat'  as const, title: 'Flat monthly',   sub: 'Unlimited QR redemptions included' },
            { id: 'usage' as const, title: 'Monthly + usage', sub: `${USAGE_FREE_REDEMPTIONS} free redemptions/mo, then ${USAGE_OVERAGE_CENTS}¢ each` },
          ]).map((o) => (
            <button key={o.id} onClick={() => setMode(o.id)} className="text-left rounded-2xl p-4 transition-all"
              style={{ background: BG_CARD, border: `1.5px solid ${mode === o.id ? BRAND : BORDER}` }}>
              <p className="text-[15px] font-bold" style={{ color: mode === o.id ? BRAND : TEXT }}>{o.title}</p>
              <p className="text-[12px] mt-1" style={{ color: TEXT_MUTED }}>{o.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Usage meter (usage mode only) */}
      {mode === 'usage' && (
        <div className="rounded-2xl p-4" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-[14px] font-bold" style={{ color: TEXT }}>Usage this month (this location)</p>
          <p className="text-[13px] mt-1" style={{ color: TEXT_MUTED }}>
            {usage} QR redemptions · {USAGE_FREE_REDEMPTIONS} included free
          </p>
          {metered > 0 && (
            <p className="text-[13px] mt-1 font-semibold" style={{ color: '#F59E0B' }}>
              {metered} past the free bucket · ≈ CA${(metered * USAGE_OVERAGE_CENTS / 100).toFixed(2)} this month
            </p>
          )}
          <p className="text-[12px] mt-1" style={{ color: TEXT_MUTED }}>
            Only scanner-verified QR redemptions count toward usage.
          </p>
        </div>
      )}

      {/* Billing cycle */}
      <div className="grid grid-cols-2 gap-2.5">
        {([
          { id: 'monthly' as const, label: 'Monthly' },
          { id: 'yearly'  as const, label: 'Yearly (save 20%)' },
        ]).map((c) => (
          <button key={c.id} onClick={() => setCycle(c.id)} className="h-12 rounded-full text-[14px] font-bold transition-all"
            style={cycle === c.id ? { background: BRAND, color: '#fff' } : { background: BG_CARD, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>
            {c.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[13px] text-red-400">{error}</p>}

      {/* Plan cards */}
      {(['starter', 'pro'] as const).map((plan) => {
        const price = planMonthlyPrice(plan, mode, cycle);
        const isPro = plan === 'pro';
        return (
          <div key={plan} className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${isPro ? BRAND : BORDER}`, color: TEXT }}>
            {isPro && (
              <span className="inline-block text-[11px] font-extrabold px-3 py-1 rounded-full mb-3" style={{ background: BRAND, color: '#fff' }}>
                BEST FOR GROWTH
              </span>
            )}
            <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: BRAND }}>{plan}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-display text-[40px] font-extrabold leading-none">CA${price}</span>
            </div>
            <p className="text-[13px] mt-1" style={{ color: TEXT_MUTED }}>
              {mode === 'flat' ? '/month per location' : '/month + usage per location'}
            </p>
            <ul className="space-y-2.5 mt-4">
              {PLAN_FEATURES[plan].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]">
                  <IconCircleCheck size={18} style={{ color: BRAND, flexShrink: 0, marginTop: 1 }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button onClick={() => subscribe(plan)} disabled={busy === plan}
              className="w-full h-12 rounded-xl font-bold text-[15px] text-white mt-5 disabled:opacity-60" style={{ background: BRAND }}>
              {busy === plan ? 'Starting…' : `Subscribe to ${plan.toUpperCase()} — ${onTrial ? 'pay at trial end' : 'start now'}`}
            </button>
          </div>
        );
      })}

      {/* Free plan card */}
      <div className="rounded-2xl p-5" style={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: TEXT }}>
        <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Free</p>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="font-display text-[40px] font-extrabold leading-none">CA$0</span>
        </div>
        <p className="text-[13px] mt-1" style={{ color: TEXT_MUTED }}>Where a location lands if the trial ends without a plan</p>
        <ul className="space-y-2.5 mt-4">
          {PLAN_FEATURES.free.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-[14px]" style={{ color: TEXT_MUTED }}>
              <IconCircleCheck size={18} style={{ color: TEXT_MUTED, flexShrink: 0, marginTop: 1 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Anti-circumvention */}
      <div className="rounded-2xl p-4" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)' }}>
        <p className="text-[14px] font-bold flex items-center gap-2" style={{ color: '#F59E0B' }}>
          <IconBolt size={16} /> Anti-circumvention policy
        </p>
        <p className="text-[13px] mt-2" style={{ color: TEXT_MUTED }}>
          Deals must be redeemed through the RepEAT scanner. Honoring app claims off-platform violates your
          agreement and skews analytics. Low scan rates may trigger a review.
        </p>
      </div>

      <p className="text-[12px] text-center pb-2" style={{ color: TEXT_MUTED }}>
        Payments processed securely by Stripe. Each restaurant location has its own subscription.
      </p>
    </div>
  );
}
