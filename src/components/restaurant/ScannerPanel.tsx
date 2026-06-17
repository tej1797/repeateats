'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconQrcode, IconCheck, IconX, IconLoader2, IconDeviceMobile, IconSun,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

const BLUE = '#1249A9';
const SUCCESS_RESET_MS = 1600;

/** Format typed chars as XXX-XXX (hyphen inserted automatically after 3rd char). */
export function formatRedeemCodePart(raw: string): string {
  const chars = raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6);
  if (chars.length <= 3) return chars;
  return `${chars.slice(0, 3)}-${chars.slice(3)}`;
}

export function buildFullRedeemCode(codePart: string): string {
  const formatted = formatRedeemCodePart(codePart.replace(/^RE-?/i, '').replace(/-/g, ''));
  return formatted ? `RE-${formatted}` : '';
}

export function isCompleteRedeemCode(codePart: string): boolean {
  return codePart.replace(/-/g, '').length === 6;
}

interface ScannerPanelProps {
  restaurantId: string | null;
  compact?: boolean;
}

// Customer's remaining redemptions, returned by claim-deal on redeem (success or
// blocked). Rendered only when present, so this is safe before the edge function
// that supplies it is deployed.
interface RedeemLimits {
  daily_cap: number;
  daily_used_today: number;
  daily_remaining: number;
  monthly_cap: number;
  monthly_pool_used: number;
  monthly_remaining: number;
  total_remaining: number;
  timezone?: string;
}

export default function ScannerPanel({ restaurantId, compact = false }: ScannerPanelProps) {
  const supabase = useRef(createClient()).current;
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [codePart,    setCodePart]    = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [error,       setError]       = useState('');
  const [successMsg,  setSuccessMsg]  = useState('');
  const [todayCount,  setTodayCount]  = useState<number | null>(null);
  const [limits,      setLimits]      = useState<RedeemLimits | null>(null);

  const fullCode = buildFullRedeemCode(codePart);
  const canSubmit = isCompleteRedeemCode(codePart) && !processing;

  const clearResetTimer = () => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
      resetTimer.current = null;
    }
  };

  const resetForm = useCallback(() => {
    clearResetTimer();
    setCodePart('');
    setError('');
    setSuccessMsg('');
    setLimits(null);
    setProcessing(false);
  }, []);

  useEffect(() => () => clearResetTimer(), []);

  const fetchCount = useCallback(async (rid: string) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('claims')
      .select('id, deals!inner(restaurant_id)', { count: 'exact', head: true })
      .eq('status', 'redeemed')
      .gte('redeemed_at', startOfDay.toISOString())
      .eq('deals.restaurant_id', rid);
    setTodayCount(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    if (!restaurantId) return;
    void fetchCount(restaurantId);
    const interval = setInterval(() => fetchCount(restaurantId), 30_000);
    return () => clearInterval(interval);
  }, [restaurantId, fetchCount]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;

    setProcessing(true);
    setError('');
    setSuccessMsg('');
    clearResetTimer();

    try {
      const res = await fetch('/api/claims/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qr_token: fullCode }),
      });
      const json = await res.json() as {
        success?: boolean;
        error?: string;
        claim?: { deal_title?: string; discount_value?: string };
        message?: string;
        limits?: RedeemLimits;
      };

      setLimits(json.limits ?? null);

      if (!res.ok) {
        setError(json.error ?? 'Failed to redeem');
        setProcessing(false);
        return;
      }

      const title = json.claim?.deal_title?.trim();
      setSuccessMsg(
        title
          ? `Redeemed: ${title}`
          : (json.message ?? 'Redeemed successfully!'),
      );
      if (restaurantId) void fetchCount(restaurantId);

      resetTimer.current = setTimeout(() => {
        resetForm();
      }, SUCCESS_RESET_MS);
    } catch {
      setError('Network error — please try again');
      setProcessing(false);
    }
  };

  const handleCodeChange = (raw: string) => {
    const stripped = raw.replace(/^RE-?/i, '');
    setCodePart(formatRedeemCodePart(stripped));
    setError('');
    setSuccessMsg('');
    setLimits(null);
    clearResetTimer();
  };

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      {todayCount !== null && (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ background: '#141414', border: '1px solid rgba(91,155,213,0.25)' }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: BLUE }} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#888]">TODAY</span>
          <span className="text-[16px] font-extrabold text-white leading-none">{todayCount}</span>
          <span className="text-[11px] font-semibold text-[#888]">
            {todayCount === 1 ? 'redemption' : 'redemptions'}
          </span>
        </div>
      )}

      <div className="text-center py-4">
        <div
          className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(18,73,169,0.15)' }}
        >
          <IconQrcode size={40} style={{ color: BLUE }} stroke={1.5} />
        </div>
        <h2 className="font-display text-[22px] font-extrabold text-white mb-2">
          Scan Customer QR Code
        </h2>
        <p className="text-[13px] text-[#888] max-w-xs mx-auto">
          Ask the customer to show their QR code from the RepEAT app
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#666] mb-2">
          Or enter code manually
        </p>
        <div className="flex items-center gap-0 mb-3">
          <span className="h-12 px-3 flex items-center text-[15px] font-bold text-white rounded-l-xl border border-r-0 border-[#333] bg-[#1A1A1A]">
            RE-
          </span>
          <input
            value={codePart}
            onChange={(e) => handleCodeChange(e.target.value)}
            placeholder="XXX-XXX"
            maxLength={7}
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="flex-1 h-12 px-3 text-[16px] font-bold font-mono tracking-widest rounded-r-xl border border-[#333] bg-[#1A1A1A] text-white outline-none focus:border-[#1249A9] uppercase"
          />
        </div>

        {error && (
          <p className="mb-3 text-[13px] text-red-400 flex items-center gap-1.5">
            <IconX size={14} /> {error}
          </p>
        )}

        {successMsg && (
          <p
            className="mb-3 text-[13px] text-green-400 flex items-center gap-1.5 p-3 rounded-xl border border-green-800/50 bg-green-950/30"
          >
            <IconCheck size={14} className="flex-shrink-0" /> {successMsg}
          </p>
        )}

        {/* Customer's remaining redemptions (rendered only when claim-deal returns it). */}
        {limits && (
          <div className="mb-3 px-3 py-2.5 rounded-xl" style={{ background: '#141414', border: '1px solid #222' }}>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-extrabold text-white leading-none">{limits.total_remaining}</span>
              <span className="text-[12px] font-semibold text-[#888]">
                {limits.total_remaining === 1 ? 'redemption left for this customer' : 'redemptions left for this customer'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[#888]">
              {limits.monthly_remaining} monthly + {limits.daily_remaining} today
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full h-12 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: canSubmit ? BLUE : '#1E3A6E' }}
        >
          {processing
            ? <><IconLoader2 size={18} className="animate-spin" /> Redeeming…</>
            : <><IconCheck size={18} /> Redeem Code</>
          }
        </button>
      </form>

      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="flex items-start gap-3 text-[13px] text-[#888]">
          <IconDeviceMobile size={18} style={{ color: BLUE }} className="flex-shrink-0 mt-0.5" />
          <span>Ask customer to open their QR code in the app</span>
        </div>
        <div className="flex items-start gap-3 text-[13px] text-[#888]">
          <IconSun size={18} style={{ color: BLUE }} className="flex-shrink-0 mt-0.5" />
          <span>Ensure good lighting for best scan accuracy</span>
        </div>
      </div>
    </div>
  );
}
