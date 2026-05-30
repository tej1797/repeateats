'use client';

// /redeem/[code] — Public QR landing page scanned by restaurant staff
// Shows claim info. Staff can tap "Redeem" to mark it used via the staff terminal.

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface ClaimInfo {
  status:     'claimed' | 'redeemed' | 'expired';
  claimed_at: string;
  deal: {
    title:          string;
    emoji:          string;
    discount_value: string | null;
    restaurant:     { name: string; city: string } | null;
  } | null;
}

export default function RedeemLandingPage() {
  const params    = useParams<{ code: string }>();
  const code      = params.code?.toUpperCase() ?? '';
  const supabase  = createClient();

  const [claim,   setClaim]   = useState<ClaimInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!code) return;
    supabase
      .from('claims')
      .select(`
        status, claimed_at,
        deal:deals (
          title, emoji, discount_value,
          restaurant:restaurants ( name, city )
        )
      `)
      .eq('qr_code', code)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) {
          setError('QR code not found. Make sure you scanned the correct code.');
        } else {
          setClaim(data as unknown as ClaimInfo);
        }
        setLoading(false);
      });
  }, [code, supabase]);

  const statusColor = claim?.status === 'redeemed'
    ? '#16a34a' : claim?.status === 'expired'
    ? '#9CA3AF' : '#065F46';

  const statusLabel = claim?.status === 'redeemed'
    ? 'Already redeemed'  : claim?.status === 'expired'
    ? 'Expired' : 'Valid — ready to redeem';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5" style={{ background: '#F8F7F4' }}>
      <div className="w-full max-w-[400px]">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-[28px] font-extrabold">
            Rep<span style={{ color: '#E85D04' }}>EAT</span>
          </Link>
          <p className="text-[13px] text-gray-500 mt-1">Staff scan verification</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-[3px] border-[#065F46]/20 border-t-[#065F46] animate-spin" />
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border-2 border-red-200 p-6 text-center shadow-sm">
            <div className="text-4xl mb-3">❌</div>
            <p className="font-bold text-[16px] text-red-700 mb-1">Invalid QR code</p>
            <p className="text-[13px] text-gray-500">{error}</p>
          </div>
        ) : claim ? (
          <div className="bg-white rounded-2xl border-2 p-6 shadow-sm" style={{ borderColor: statusColor }}>
            {/* Deal info */}
            <div className="flex items-start gap-4 mb-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ background: 'rgba(6,95,70,0.08)' }}>
                {claim.deal?.emoji ?? '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[17px] text-gray-900 leading-snug">{claim.deal?.title ?? 'Deal'}</p>
                {claim.deal?.discount_value && (
                  <p className="text-[14px] font-bold mt-0.5" style={{ color: '#065F46' }}>{claim.deal.discount_value}</p>
                )}
                <p className="text-[12px] text-gray-500 mt-0.5">
                  {claim.deal?.restaurant?.name ?? ''}{claim.deal?.restaurant?.city ? ` · ${claim.deal.restaurant.city}` : ''}
                </p>
              </div>
            </div>

            {/* Code + date */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">QR Code</p>
                <p className="font-mono font-bold text-[16px] text-gray-900">{code}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Claimed</p>
                <p className="font-semibold text-[13px] text-gray-900">
                  {new Date(claim.claimed_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5"
              style={{ background: `${statusColor}18`, border: `1.5px solid ${statusColor}40` }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
              <p className="font-bold text-[14px]" style={{ color: statusColor }}>{statusLabel}</p>
            </div>

            {/* Redeem button — only if claim is valid */}
            {claim.status === 'claimed' && (
              <Link
                href={`/restaurant/redeem`}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-[15px] text-white transition-all"
                style={{ background: '#065F46' }}
              >
                Open staff redeem terminal →
              </Link>
            )}

            {claim.status !== 'claimed' && (
              <p className="text-center text-[13px] text-gray-400 mt-2">
                {claim.status === 'redeemed' ? 'This code has already been used.' : 'This code can no longer be redeemed.'}
              </p>
            )}
          </div>
        ) : null}

        <p className="text-center text-[12px] text-gray-400 mt-6">
          RepEAT · Staff verification portal · <Link href="/" className="underline hover:text-gray-600">Home</Link>
        </p>
      </div>
    </div>
  );
}
