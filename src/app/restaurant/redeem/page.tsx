'use client';

// /restaurant/redeem — Staff QR code redemption terminal
// Restaurant staff enter the customer's QR code (RE-XXXXXX format) to mark the deal as redeemed.
// Auth-protected: must be signed in as a restaurant owner.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconQrcode, IconCheck, IconX, IconLoader2 } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

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

const GREEN = '#065F46';

export default function RedeemPage() {
  const router   = useRouter();
  const supabase = useRef(createClient()).current;

  const [authChecked, setAuthChecked] = useState(false);
  const [authed,      setAuthed]      = useState(false);

  const [code,     setCode]     = useState('');
  const [looking,  setLooking]  = useState(false);
  const [preview,  setPreview]  = useState<ClaimPreview | null>(null);
  const [lookErr,  setLookErr]  = useState('');

  const [redeeming,   setRedeeming]   = useState(false);
  const [redeemErr,   setRedeemErr]   = useState('');
  const [redeemDone,  setRedeemDone]  = useState(false);

  // Auth check — must be a signed-in restaurant owner
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/restaurant');
      } else {
        setAuthed(true);
        setAuthChecked(true);
      }
    });
  }, [supabase, router]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const qr = code.trim().toUpperCase();
    if (!qr) return;

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
      const res  = await fetch(`/api/claims/${encodeURIComponent(preview.qr_code)}/redeem`, { method: 'POST' });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setRedeemErr(json.error ?? 'Failed to redeem');
      } else {
        setRedeemDone(true);
        setPreview((p) => p ? { ...p, status: 'redeemed' } : p);
      }
    } catch {
      setRedeemErr('Network error — please try again');
    } finally {
      setRedeeming(false);
    }
  };

  const handleReset = () => {
    setCode('');
    setPreview(null);
    setLookErr('');
    setRedeemErr('');
    setRedeemDone(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-[3px] border-t-transparent animate-spin" style={{ borderColor: `${GREEN}33`, borderTopColor: GREEN }} />
      </div>
    );
  }

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-[var(--bg)]">

      {/* Header */}
      <header className="bg-surface border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/restaurant" className="flex items-center gap-2 text-[14px] font-semibold text-t2 hover:text-tx transition-colors">
            <IconArrowLeft size={16} /> Back to dashboard
          </Link>
          <div className="flex-1" />
          <div className="font-display text-[20px] font-extrabold">
            Rep<span className="text-brand">EAT</span>
          </div>
        </div>
        <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${GREEN}, transparent)` }} />
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">

        {/* Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(6,95,70,0.1)' }}>
            <IconQrcode size={32} style={{ color: GREEN }} />
          </div>
          <h1 className="font-display text-[26px] font-extrabold mb-2">Redeem a Deal</h1>
          <p className="text-[14px] text-t2">Enter the customer&apos;s QR code shown on their phone to mark the deal as redeemed.</p>
        </div>

        {/* QR input form */}
        <form onSubmit={handleLookup} className="mb-6">
          <label className="block text-[13px] font-bold text-t2 uppercase tracking-wide mb-2">Customer QR Code</label>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setLookErr(''); setPreview(null); setRedeemDone(false); }}
              placeholder="RE-4A7X2B"
              maxLength={9}
              autoFocus
              className="flex-1 h-12 px-4 text-[18px] font-bold font-mono tracking-widest border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx outline-none uppercase focus:ring-2 transition-all"
              style={{ letterSpacing: '0.1em' }}
              onFocus={(e) => (e.target.style.borderColor = GREEN)}
              onBlur={(e) => (e.target.style.borderColor = '')}
            />
            <button
              type="submit"
              disabled={looking || code.length < 3}
              className="h-12 px-5 font-semibold text-[14px] text-white rounded-brands transition-all disabled:opacity-50"
              style={{ background: GREEN }}
            >
              {looking ? <IconLoader2 size={18} className="animate-spin" /> : 'Look up'}
            </button>
          </div>
          {lookErr && (
            <p className="mt-2 text-[13px] text-red-600 flex items-center gap-1.5">
              <IconX size={14} /> {lookErr}
            </p>
          )}
        </form>

        {/* Claim preview */}
        {preview && (
          <div
            className="bg-surface rounded-brand border-2 p-6 animate-[slideUp_0.2s_ease]"
            style={{ borderColor: preview.status === 'redeemed' ? '#16a34a' : preview.status === 'expired' ? '#9CA3AF' : GREEN }}
          >
            {/* Deal info */}
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-brands flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'rgba(6,95,70,0.08)' }}
              >
                {preview.deal?.emoji ?? '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[17px] text-tx leading-snug">{preview.deal?.title ?? 'Deal'}</p>
                {preview.deal?.discount_value && (
                  <p className="text-[14px] font-bold text-brand mt-0.5">{preview.deal.discount_value}</p>
                )}
                <p className="text-[12px] text-t2 mt-1">{preview.deal?.restaurant?.name}</p>
              </div>
            </div>

            {/* Claim meta */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-surface2 rounded-brands p-3">
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">QR Code</p>
                <p className="font-mono font-bold text-[15px] text-tx">{preview.qr_code}</p>
              </div>
              <div className="bg-surface2 rounded-brands p-3">
                <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-0.5">Claimed</p>
                <p className="font-semibold text-[13px] text-tx">
                  {new Date(preview.claimed_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Status + action */}
            {preview.status === 'redeemed' || redeemDone ? (
              <div className="flex items-center gap-2 p-3 rounded-brands bg-green-50 border border-green-200">
                <IconCheck size={18} className="text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-[14px] text-green-700">
                    {redeemDone ? 'Redeemed successfully!' : 'Already redeemed'}
                  </p>
                  {preview.redeemed_at && !redeemDone && (
                    <p className="text-[12px] text-green-600">
                      Redeemed on {new Date(preview.redeemed_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>
            ) : preview.status === 'expired' ? (
              <div className="flex items-center gap-2 p-3 rounded-brands bg-gray-50 border border-gray-200">
                <IconX size={18} className="text-gray-500 flex-shrink-0" />
                <p className="font-semibold text-[14px] text-gray-600">This QR code has expired</p>
              </div>
            ) : (
              <div className="space-y-2">
                {redeemErr && (
                  <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                    <IconX size={14} /> {redeemErr}
                  </p>
                )}
                <button
                  onClick={handleRedeem}
                  disabled={redeeming}
                  className="w-full h-12 font-bold text-[15px] text-white rounded-brands transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: GREEN }}
                >
                  {redeeming
                    ? <><IconLoader2 size={18} className="animate-spin" /> Redeeming…</>
                    : <><IconCheck size={18} /> Confirm Redemption</>
                  }
                </button>
              </div>
            )}
          </div>
        )}

        {/* After successful redeem — scan another */}
        {(redeemDone || preview?.status === 'redeemed') && (
          <button
            onClick={handleReset}
            className="mt-4 w-full h-11 border-2 border-[var(--bd2)] rounded-brands text-[14px] font-semibold text-t2 hover:border-[var(--bd)] hover:text-tx transition-all"
          >
            Scan another QR code
          </button>
        )}

        {/* Instructions */}
        {!preview && !lookErr && (
          <div className="mt-8 bg-surface rounded-brand border border-[var(--bd)] p-5">
            <p className="text-[13px] font-bold text-t2 uppercase tracking-wide mb-3">How it works</p>
            <ol className="space-y-2.5">
              {[
                'Customer shows their QR code on the RepEAT app',
                'Enter the code above (format: RE-XXXXXX)',
                'Confirm the deal details are correct',
                'Tap "Confirm Redemption" to mark it as used',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-t2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5" style={{ background: GREEN }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}

      </main>
    </div>
  );
}
