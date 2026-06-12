'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconQrcode, IconCheck, IconX, IconLoader2, IconDeviceMobile, IconSun,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { formatDealTitle } from '@/lib/utils';

interface ClaimPreview {
  id:          string;
  qr_code:     string;
  status:      'claimed' | 'redeemed' | 'expired';
  claimed_at:  string;
  redeemed_at: string | null;
  deal: {
    title:          string;
    emoji:          string;
    discount_value: string | null;
    restaurant:     { name: string };
  } | null;
}

const BLUE = '#1249A9';

interface ScannerPanelProps {
  restaurantId: string | null;
  compact?: boolean;
}

export default function ScannerPanel({ restaurantId, compact = false }: ScannerPanelProps) {
  const supabase = useRef(createClient()).current;

  const [codePart,   setCodePart]   = useState('');
  const [looking,    setLooking]    = useState(false);
  const [preview,    setPreview]    = useState<ClaimPreview | null>(null);
  const [lookErr,    setLookErr]    = useState('');
  const [redeeming,  setRedeeming]  = useState(false);
  const [redeemErr,  setRedeemErr]  = useState('');
  const [redeemDone, setRedeemDone] = useState(false);
  const [todayCount, setTodayCount] = useState<number | null>(null);

  const fullCode = codePart.trim()
    ? `RE-${codePart.replace(/^RE-/i, '').toUpperCase()}`
    : '';

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

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const qr = fullCode;
    if (!qr || qr.length < 6) return;

    setLooking(true);
    setLookErr('');
    setPreview(null);
    setRedeemDone(false);
    setRedeemErr('');

    try {
      const res  = await fetch(`/api/claims/${encodeURIComponent(qr)}/redeem`);
      const json = await res.json() as { data?: ClaimPreview; error?: string };
      if (!res.ok) {
        setLookErr(json.error ?? 'QR code not found');
      } else if (json.data) {
        setPreview(json.data);
      }
    } catch {
      setLookErr('Network error — please try again');
    } finally {
      setLooking(false);
    }
  };

  const handleRedeem = async () => {
    if (!preview) return;
    setRedeeming(true);
    setRedeemErr('');
    try {
      const res = await fetch('/api/claims/redeem', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ qr_token: preview.qr_code }),
      });
      const json = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) {
        setRedeemErr(json.error ?? 'Failed to redeem');
      } else {
        setRedeemDone(true);
        setPreview((p) => p ? { ...p, status: 'redeemed' } : p);
        if (restaurantId) void fetchCount(restaurantId);
      }
    } catch {
      setRedeemErr('Network error — please try again');
    } finally {
      setRedeeming(false);
    }
  };

  const handleReset = () => {
    setCodePart('');
    setPreview(null);
    setLookErr('');
    setRedeemErr('');
    setRedeemDone(false);
  };

  const canRedeem = fullCode.length >= 8 && !looking;

  return (
    <div className={compact ? 'space-y-5' : 'space-y-6'}>
      {/* Today badge */}
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

      {/* Hero — no camera on web */}
      {!preview && (
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
      )}

      {/* Manual entry */}
      <form onSubmit={handleLookup}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#666] mb-2">
          Or enter code manually
        </p>
        <div className="flex items-center gap-0 mb-3">
          <span className="h-12 px-3 flex items-center text-[15px] font-bold text-white rounded-l-xl border border-r-0 border-[#333] bg-[#1A1A1A]">
            RE-
          </span>
          <input
            value={codePart}
            onChange={(e) => {
              const v = e.target.value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
              setCodePart(v.replace(/^RE-?/i, ''));
              setLookErr('');
              setPreview(null);
              setRedeemDone(false);
            }}
            placeholder="XXX-XXX"
            maxLength={7}
            className="flex-1 h-12 px-3 text-[16px] font-bold font-mono tracking-widest rounded-r-xl border border-[#333] bg-[#1A1A1A] text-white outline-none focus:border-[#1249A9] uppercase"
          />
        </div>

        {lookErr && (
          <p className="mb-3 text-[13px] text-red-400 flex items-center gap-1.5">
            <IconX size={14} /> {lookErr}
          </p>
        )}

        <button
          type="submit"
          disabled={!canRedeem}
          className="w-full h-12 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
          style={{ background: canRedeem ? BLUE : '#1E3A6E' }}
        >
          {looking
            ? <><IconLoader2 size={18} className="animate-spin" /> Looking up…</>
            : <><IconCheck size={18} /> Redeem Code</>
          }
        </button>
      </form>

      {/* Preview + confirm */}
      {preview && (
        <div
          className="rounded-2xl border p-5 animate-[slideUp_0.2s_ease]"
          style={{
            borderColor: preview.status === 'redeemed' || redeemDone ? '#22C55E' : BLUE,
            background: '#141414',
          }}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-[#1A1A1A]">
              {preview.deal?.emoji ?? '🍽️'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[16px] text-white">{formatDealTitle(preview.deal?.title) || 'Deal'}</p>
              {preview.deal?.discount_value && (
                <p className="text-[13px] font-bold text-brand mt-0.5">{preview.deal.discount_value}</p>
              )}
              <p className="text-[11px] text-[#888] mt-1 font-mono">{preview.qr_code}</p>
            </div>
          </div>

          {preview.status === 'redeemed' || redeemDone ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-950/40 border border-green-800/50">
              <IconCheck size={18} className="text-green-400 flex-shrink-0" />
              <p className="font-bold text-[14px] text-green-400">
                {redeemDone ? 'Redeemed successfully!' : 'Already redeemed'}
              </p>
            </div>
          ) : preview.status === 'expired' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#1A1A1A] border border-[#333]">
              <IconX size={18} className="text-[#888]" />
              <p className="font-semibold text-[14px] text-[#888]">This QR code has expired</p>
            </div>
          ) : (
            <div className="space-y-2">
              {redeemErr && (
                <p className="text-[13px] text-red-400 flex items-center gap-1.5">
                  <IconX size={14} /> {redeemErr}
                </p>
              )}
              <button
                type="button"
                onClick={handleRedeem}
                disabled={redeeming}
                className="w-full h-11 font-bold text-[14px] text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: '#22C55E' }}
              >
                {redeeming
                  ? <><IconLoader2 size={16} className="animate-spin" /> Redeeming…</>
                  : <><IconCheck size={16} /> Confirm Redemption</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {(redeemDone || preview?.status === 'redeemed') && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full h-10 border border-[#333] rounded-xl text-[13px] font-semibold text-[#888] hover:text-white hover:border-[#555] transition-all"
        >
          Redeem another code
        </button>
      )}

      {/* Tips */}
      {!preview && (
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
      )}
    </div>
  );
}
