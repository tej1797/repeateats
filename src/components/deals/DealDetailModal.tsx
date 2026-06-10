'use client';

import { useRouter } from 'next/navigation';
import { IconX, IconCheck, IconShare2, IconCircleCheck, IconChevronRight } from '@tabler/icons-react';
import type { DealWithRestaurant } from '@/types/index';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { formatDiscountValue } from '@/lib/utils';

// Unsplash fallback images per cuisine category
const CATEGORY_IMAGES: Record<string, string> = {
  indian:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  bbq:       'https://images.unsplash.com/photo-1558030006-450675393462?w=600&q=80',
  italian:   'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80',
  bar:       'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=600&q=80',
  canadian:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
  bubbletea: 'https://images.unsplash.com/photo-1558857563-b371033873b8?w=600&q=80',
  pizza:     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
  burgers:   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
  sushi:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80',
  desserts:  'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
  vegan:     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80',
  chinese:   'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600&q=80',
  seafood:   'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  default:   'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80',
};

// ─── Soft upsell shown when the daily limit is hit ────────────────────────────
function DailyLimitReached({ plan }: { plan: string }) {
  const router = useRouter();

  const messages: Record<string, { title: string; sub: string; cta: string }> = {
    free: {
      title: "You've used your 1 free claim for today",
      sub:   'Upgrade to Starter to claim up to 3 deals per day, or Pro for full week access.',
      cta:   'See RepEAT+ plans →',
    },
    starter: {
      title: "You've used all 3 claims for today",
      sub:   'Upgrade to Pro for 30 deals/month and full week deal previews.',
      cta:   'Upgrade to Pro →',
    },
  };

  const msg = messages[plan] ?? messages.free;

  return (
    <div
      style={{
        background:    'rgba(255, 122, 0, 0.08)',
        border:        '1px solid rgba(255, 122, 0, 0.25)',
        borderRadius:  12,
        padding:       '14px 16px',
      }}
    >
      <p style={{ fontSize: 14, fontWeight: 500, color: '#FF7A00', margin: '0 0 4px' }}>
        {msg.title}
      </p>
      <p style={{ fontSize: 13, color: 'var(--t2)', margin: '0 0 10px', lineHeight: 1.5 }}>
        {msg.sub}
      </p>
      <button
        onClick={() => router.push('/repeat-plus')}
        style={{
          display:        'inline-flex',
          alignItems:     'center',
          gap:            6,
          background:     '#FF7A00',
          color:          '#fff',
          border:         'none',
          borderRadius:   8,
          padding:        '8px 14px',
          fontSize:       13,
          fontWeight:     500,
          cursor:         'pointer',
        }}
      >
        {msg.cta}
      </button>
    </div>
  );
}

interface DealDetailModalProps {
  deal:               DealWithRestaurant;
  user:               User | null;
  planTier?:          'free' | 'starter' | 'pro' | 'yearly';
  onClose:            () => void;
  onClaim:            () => void;
  claiming?:          boolean;
  claimError?:        string | null;
  alreadyClaimed?:    boolean;
  existingQrCode?:    string;
  isRedeemed?:        boolean;
  dailyLimitReached?: boolean;
  onViewExisting?:    (code: string) => void;
  onShare?:           () => void;
}

export default function DealDetailModal({
  deal,
  user,
  planTier           = 'free',
  onClose,
  onClaim,
  claiming           = false,
  claimError         = null,
  alreadyClaimed     = false,
  existingQrCode,
  isRedeemed         = false,
  dailyLimitReached  = false,
  onViewExisting,
  onShare,
}: DealDetailModalProps) {
  const router = useRouter();

  const spotsLeft      = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const soldOut        = deal.max_claims !== null && spotsLeft !== null && spotsLeft <= 0;
  const canSeeSchedule = planTier === 'starter' || planTier === 'pro' || planTier === 'yearly';
  const progressPct    = deal.max_claims ? Math.min(100, (deal.current_claims / deal.max_claims) * 100) : 0;

  // Header image: deal photo → cuisine Unsplash fallback
  const cuisine   = (deal.restaurant?.category ?? deal.restaurant?.cuisine ?? 'default').toLowerCase();
  const headerImg = CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default;

  // Deal type badge text
  const badgeLabel = deal.deal_types?.length > 0 ? deal.deal_types[0].toUpperCase() : null;

  // Show the upsell block when daily limit hit and no pending claim already active
  const showLimitUpsell = dailyLimitReached && !alreadyClaimed && !isRedeemed && user;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-surface rounded-t-[24px] sm:rounded-[20px] shadow-brand2 w-full max-w-sm overflow-hidden max-h-[93vh] overflow-y-auto animate-[slideUp_0.22s_ease] flex flex-col">

        {/* ── Header image area ── */}
        <div className="relative h-[180px] flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={headerImg}
            alt={deal.restaurant?.name ?? ''}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20" />

          {/* Large emoji centre */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-7xl drop-shadow-lg">{deal.emoji ?? '🍽️'}</span>
          </div>

          {/* Close button top-left */}
          <button
            onClick={onClose}
            className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
            aria-label="Close"
          >
            <IconX size={16} />
          </button>

          {/* Share button */}
          {onShare && (
            <button
              onClick={onShare}
              className="absolute top-3 right-14 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
              aria-label="Share deal"
            >
              <IconShare2 size={16} />
            </button>
          )}

          {/* Claim count badge top-right */}
          {deal.current_claims > 0 && (
            <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-[12px] font-bold px-2.5 py-1 rounded-full">
              🔥 {deal.current_claims} claimed
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-5 pt-4 pb-5 flex flex-col gap-4">

          {/* Deal type badge + title */}
          <div>
            {badgeLabel && (
              <span className="inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-2 bg-brand text-white uppercase tracking-wide">
                {badgeLabel}
              </span>
            )}
            <div className="font-display text-[32px] font-extrabold text-brand leading-none mb-1">
              {formatDiscountValue(deal.discount_value)}
            </div>
            <p className="text-[14px] font-semibold text-tx leading-snug">
              {deal.title}
              {canSeeSchedule && deal.available_days && deal.available_days[0] !== 'all' && (
                <span className="text-t2 font-normal"> — {deal.available_days.join(', ')}</span>
              )}
              {!canSeeSchedule && (
                <button
                  onClick={() => { window.location.href = '/repeat-plus'; }}
                  className="ml-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(212,175,55,0.12)', color: '#B8971F' }}
                >
                  🔒 Schedule
                </button>
              )}
            </p>
          </div>

          {/* Restaurant row — tappable */}
          {deal.restaurant?.id && (
            <button
              onClick={() => { onClose(); router.push(`/customer/restaurant/${deal.restaurant!.id}`); }}
              className="flex items-center gap-3 w-full bg-surface2 rounded-brands px-3 py-2.5 hover:bg-[var(--bd)] transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center flex-shrink-0 text-white font-bold text-[16px]">
                {deal.emoji ?? '🍽️'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[14px] text-tx truncate">{deal.restaurant.name}</p>
                <p className="text-[12px] text-t2 truncate">
                  {deal.restaurant.cuisine && `${deal.restaurant.cuisine} · `}{deal.restaurant.city ?? ''}
                </p>
              </div>
              <IconChevronRight size={16} className="text-t3 flex-shrink-0" />
            </button>
          )}

          {/* Claims progress bar */}
          {deal.max_claims !== null && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] font-bold text-t3 uppercase tracking-wide">Claims</span>
                <span className="text-[12px] font-bold text-tx">{deal.current_claims} / {deal.max_claims}</span>
              </div>
              <div className="h-2 bg-[var(--bd2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* About this deal */}
          {deal.description && (
            <div>
              <p className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-1.5">About this deal</p>
              <p className="text-[14px] text-t2 leading-relaxed">{deal.description}</p>
            </div>
          )}

          {/* Validity */}
          {canSeeSchedule && deal.valid_until && (
            <p className="text-[12px] text-t3">Ends {deal.valid_until}</p>
          )}

          {/* API error (non-limit errors only) */}
          {claimError && !dailyLimitReached && (
            <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2">
              {claimError}
            </p>
          )}

          {/* Daily limit upsell — shown instead of the error string when limit is hit */}
          {showLimitUpsell && <DailyLimitReached plan={planTier} />}

          {/* CTA */}
          {deal.is_coming ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Available next week
            </div>
          ) : soldOut ? (
            <div className="w-full h-12 rounded-brands bg-surface2 border border-[var(--bd2)] flex items-center justify-center text-[15px] font-semibold text-t2">
              Fully claimed
            </div>
          ) : !user ? (
            <Link
              href="/customer/login"
              className="w-full h-12 bg-brand hover:bg-brand2 text-white font-semibold rounded-brands flex items-center justify-center transition-colors text-[15px]"
            >
              Sign in to claim this deal
            </Link>
          ) : isRedeemed ? (
            <div className="w-full h-12 rounded-brands bg-green-50 border border-green-200 flex items-center justify-center gap-2 text-[15px] font-semibold text-green-700">
              <IconCircleCheck size={18} /> Redeemed — deal used
            </div>
          ) : alreadyClaimed && existingQrCode ? (
            <button
              onClick={() => onViewExisting?.(existingQrCode)}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-brands transition-colors text-[15px] flex items-center justify-center gap-2"
            >
              <IconCheck size={18} /> Already claimed — View QR Code
            </button>
          ) : (
            // Normal claim button — muted + non-interactive when daily limit reached
            <button
              onClick={dailyLimitReached ? undefined : onClaim}
              disabled={claiming || dailyLimitReached}
              className="w-full h-12 bg-brand text-white font-semibold rounded-brands transition-colors text-[15px]"
              style={dailyLimitReached ? { opacity: 0.4, cursor: 'default' } : {}}
            >
              {claiming ? 'Claiming…' : 'Claim Deal'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
