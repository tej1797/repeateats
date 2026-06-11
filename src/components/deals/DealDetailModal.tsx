'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconArrowLeft, IconShare2, IconCircleCheck, IconChevronRight, IconClock, IconLayoutGrid, IconCalendarClock, IconBolt } from '@tabler/icons-react';
import type { DealWithRestaurant } from '@/types/index';
import type { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { CUSTOMER_UI } from '@/lib/customerUI';

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

// ─── Title-case helper for deal_types chips (dine-in → Dine-In) ──────────────
function titleCase(s: string): string {
  return s
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

interface DealDetailModalProps {
  deal:               DealWithRestaurant;
  user:               User | null;
  planTier?:          'free' | 'starter' | 'pro' | 'yearly';
  onClose:            () => void;
  onClaim:            (opts?: { timer_starts_at?: string; claim_for_date?: string }) => void;
  claiming?:          boolean;
  claimError?:        string | null;
  alreadyClaimed?:    boolean;
  existingQrCode?:    string;
  isRedeemed?:        boolean;
  dailyLimitReached?: boolean;
  /** YYYY-MM-DD of the day tab the deal was opened from (today if omitted). */
  claimForDate?:      string;
  /** Minutes the visit window stays open once it starts (tier-based). */
  visitWindowMinutes?: number;
  onViewExisting?:    (code: string) => void;
  onShare?:           () => void;
}

// Round a Date up to the next 15-minute mark, formatted for datetime-local.
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  claimForDate,
  visitWindowMinutes = 45,
  onViewExisting,
  onShare,
}: DealDetailModalProps) {
  const router = useRouter();

  // Starter / Pro / yearly can schedule a future visit start time.
  const canSchedule = planTier === 'starter' || planTier === 'pro' || planTier === 'yearly';
  const [scheduling, setScheduling] = useState(false);
  // For a future day tab, scheduling is required (the visit can't start today).
  const isFutureDay = useMemo(() => {
    if (!claimForDate) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return new Date(`${claimForDate}T00:00:00`).getTime() > today.getTime();
  }, [claimForDate]);

  // Default scheduled time: start of the chosen day at 12:00, or now + 30min for today.
  const defaultSchedule = useMemo(() => {
    if (isFutureDay && claimForDate) return `${claimForDate}T12:00`;
    const d = new Date(Date.now() + 30 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    return toLocalInputValue(d);
  }, [isFutureDay, claimForDate]);

  const [scheduleAt, setScheduleAt] = useState(defaultSchedule);

  const minSchedule = useMemo(() => {
    if (isFutureDay && claimForDate) return `${claimForDate}T00:00`;
    return toLocalInputValue(new Date());
  }, [isFutureDay, claimForDate]);

  const submitClaim = (mode: 'now' | 'schedule') => {
    if (mode === 'schedule') {
      const iso = new Date(scheduleAt).toISOString();
      onClaim({ timer_starts_at: iso, claim_for_date: claimForDate });
    } else {
      onClaim(claimForDate ? { claim_for_date: claimForDate } : undefined);
    }
  };

  const spotsLeft   = deal.max_claims !== null ? deal.max_claims - deal.current_claims : null;
  const soldOut     = deal.max_claims !== null && spotsLeft !== null && spotsLeft <= 0;
  const progressPct = deal.max_claims ? Math.min(100, (deal.current_claims / deal.max_claims) * 100) : 0;

  const cuisine   = (deal.restaurant?.category ?? deal.restaurant?.cuisine ?? 'default').toLowerCase();
  const headerImg = CATEGORY_IMAGES[cuisine] ?? CATEGORY_IMAGES.default;

  const dealTypeChips = deal.deal_types ?? [];
  const dayChips      = (deal.available_days ?? []).filter(d => d.toLowerCase() !== 'all');

  // Terms list — mirrors mobile copy
  const terms = [
    'One redemption per customer per deal',
    'Show the QR code at the restaurant',
    'Cannot be combined with other offers',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      <div
        className="relative w-full sm:max-w-md overflow-hidden sm:rounded-[24px] max-h-screen sm:max-h-[93vh] overflow-y-auto flex flex-col"
        style={{ background: CUSTOMER_UI.bg, color: CUSTOMER_UI.textPrimary }}
      >
        {/* ── Top bar (restaurant name + grid icon) ── */}
        <div
          className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
          style={{ background: CUSTOMER_UI.bg }}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-[15px] font-semibold truncate"
            style={{ color: CUSTOMER_UI.textPrimary }}
          >
            <IconArrowLeft size={18} className="flex-shrink-0" />
            <span className="truncate">{deal.restaurant?.name ?? 'Deal'}</span>
          </button>
          <IconLayoutGrid size={18} style={{ color: CUSTOMER_UI.textSecondary }} className="flex-shrink-0" />
        </div>

        {/* ── Restaurant title + category row ── */}
        <div className="px-4 pb-3 text-center">
          <p className="text-[16px] font-extrabold" style={{ color: CUSTOMER_UI.accent }}>
            {deal.restaurant?.name}
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: CUSTOMER_UI.textSecondary }}>
            {deal.restaurant?.name}
            {deal.deal_types?.[0] ? ` · ${deal.deal_types[0].toUpperCase()}` : ''}
          </p>
        </div>

        {/* ── Header image ── */}
        <div className="relative h-[190px] flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={headerImg} alt={deal.restaurant?.name ?? ''} className="w-full h-full object-cover" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(to top, ${CUSTOMER_UI.bg} 4%, transparent 55%)` }}
          />
          {onShare && (
            <button
              onClick={onShare}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
              aria-label="Share deal"
            >
              <IconShare2 size={16} />
            </button>
          )}
          {deal.current_claims > 0 && (
            <div
              className="absolute top-3 left-3 text-[12px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(0,0,0,0.55)', color: '#fff' }}
            >
              🔥 {deal.current_claims} claimed
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-4 pt-1 pb-6 flex flex-col gap-5">

          {/* Big title */}
          <div>
            <h1 className="font-display text-[34px] font-extrabold leading-[1.05]" style={{ color: CUSTOMER_UI.textPrimary }}>
              {deal.title}
            </h1>
            {deal.description && (
              <p className="text-[15px] mt-1" style={{ color: CUSTOMER_UI.textSecondary }}>
                {deal.description}
              </p>
            )}
          </div>

          {/* Restaurant card */}
          {deal.restaurant?.id && (
            <button
              onClick={() => { onClose(); router.push(`/customer/restaurant/${deal.restaurant!.id}`); }}
              className="flex items-center gap-3 w-full rounded-2xl px-3.5 py-3 text-left"
              style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
            >
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-[20px]"
                style={{ background: CUSTOMER_UI.accent }}
              >
                {deal.emoji ?? '🏪'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px] truncate" style={{ color: CUSTOMER_UI.textPrimary }}>
                  {deal.restaurant.name}
                </p>
                <p className="text-[13px] truncate" style={{ color: CUSTOMER_UI.textSecondary }}>
                  {deal.restaurant.cuisine && `${deal.restaurant.cuisine} · `}{deal.restaurant.city ?? ''}
                </p>
              </div>
              <IconChevronRight size={18} style={{ color: CUSTOMER_UI.textMuted }} className="flex-shrink-0" />
            </button>
          )}

          {/* Claimed progress bar */}
          {deal.max_claims !== null && (
            <div
              className="rounded-2xl px-4 py-3.5"
              style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: CUSTOMER_UI.textMuted }}>
                  Claimed
                </span>
                <span className="text-[13px] font-bold" style={{ color: CUSTOMER_UI.textPrimary }}>
                  {deal.current_claims} / {deal.max_claims}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: CUSTOMER_UI.accent }} />
              </div>
            </div>
          )}

          {/* Where & When */}
          {(dealTypeChips.length > 0 || dayChips.length > 0) && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: CUSTOMER_UI.textMuted }}>
                Where &amp; When
              </p>
              <div className="flex flex-wrap gap-2 mb-2">
                {dealTypeChips.map(t => (
                  <span
                    key={t}
                    className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full"
                    style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
                  >
                    {titleCase(t)}
                  </span>
                ))}
              </div>
              {dayChips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {dayChips.map(d => (
                    <span
                      key={d}
                      className="text-[13px] font-semibold px-3.5 py-1.5 rounded-full"
                      style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary }}
                    >
                      {titleCase(d)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Terms */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: CUSTOMER_UI.textMuted }}>
              Terms
            </p>
            <ul className="space-y-2">
              {terms.map(t => (
                <li key={t} className="flex items-start gap-2.5">
                  <IconCircleCheck size={17} className="flex-shrink-0 mt-0.5" style={{ color: CUSTOMER_UI.gold }} />
                  <span className="text-[14px]" style={{ color: CUSTOMER_UI.textSecondary }}>{t}</span>
                </li>
              ))}
              {deal.valid_until && (
                <li className="flex items-start gap-2.5">
                  <IconClock size={17} className="flex-shrink-0 mt-0.5" style={{ color: CUSTOMER_UI.gold }} />
                  <span className="text-[14px]" style={{ color: CUSTOMER_UI.textSecondary }}>Expires {deal.valid_until}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Error */}
          {claimError && !dailyLimitReached && (
            <p
              className="text-[13px] rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              {claimError}
            </p>
          )}

          {dailyLimitReached && !alreadyClaimed && !isRedeemed && user && (
            <div
              className="rounded-xl px-4 py-3.5"
              style={{ background: CUSTOMER_UI.accentSoft, border: `1px solid ${CUSTOMER_UI.accent}` }}
            >
              <p className="text-[14px] font-bold mb-1" style={{ color: CUSTOMER_UI.accent }}>
                You&apos;ve hit your redemption limit
              </p>
              <p className="text-[13px] mb-3" style={{ color: CUSTOMER_UI.textSecondary }}>
                Upgrade to RepEAT+ for more daily redemptions and full-week access.
              </p>
              <button
                onClick={() => router.push('/repeat-plus')}
                className="inline-flex h-9 px-4 rounded-lg text-[13px] font-bold text-white items-center"
                style={{ background: CUSTOMER_UI.accent }}
              >
                See RepEAT+ plans →
              </button>
            </div>
          )}

          {/* Visit-time scheduling (Starter / Pro / yearly) */}
          {canSchedule && user && !alreadyClaimed && !isRedeemed && !soldOut && !deal.is_coming && !dailyLimitReached && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: CUSTOMER_UI.textMuted }}>
                Visit time
              </p>
              {!isFutureDay && (
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setScheduling(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                    style={!scheduling
                      ? { background: CUSTOMER_UI.accent, color: '#fff' }
                      : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
                  >
                    <IconBolt size={15} /> Claim now
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduling(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-bold transition-all"
                    style={scheduling
                      ? { background: CUSTOMER_UI.accent, color: '#fff' }
                      : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }}
                  >
                    <IconCalendarClock size={15} /> Schedule
                  </button>
                </div>
              )}

              {(scheduling || isFutureDay) && (
                <div>
                  <label className="block text-[12px] mb-1.5" style={{ color: CUSTOMER_UI.textSecondary }}>
                    Pick your visit start time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    min={minSchedule}
                    onChange={e => setScheduleAt(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl text-[14px] outline-none"
                    style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textPrimary, colorScheme: 'dark' }}
                  />
                  <p className="text-[12px] mt-2 flex items-center gap-1.5" style={{ color: CUSTOMER_UI.textMuted }}>
                    <IconClock size={13} style={{ color: CUSTOMER_UI.claimBlue }} />
                    Your {visitWindowMinutes}-min visit window starts then. It waits in your Claims until that time.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sticky CTA ── */}
        <div
          className="sticky bottom-0 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]"
          style={{ background: CUSTOMER_UI.bg, borderTop: `1px solid ${CUSTOMER_UI.glassBorder}` }}
        >
          {deal.is_coming ? (
            <div className="w-full h-13 py-3.5 rounded-2xl flex items-center justify-center text-[15px] font-semibold" style={{ background: CUSTOMER_UI.glassBg, color: CUSTOMER_UI.textSecondary }}>
              Available next week
            </div>
          ) : soldOut ? (
            <div className="w-full py-3.5 rounded-2xl flex items-center justify-center text-[15px] font-semibold" style={{ background: CUSTOMER_UI.glassBg, color: CUSTOMER_UI.textSecondary }}>
              Fully claimed
            </div>
          ) : !user ? (
            <Link
              href="/customer/login"
              className="w-full py-3.5 rounded-2xl flex items-center justify-center transition-opacity text-[16px] font-bold text-white hover:opacity-90"
              style={{ background: CUSTOMER_UI.accent }}
            >
              Sign in to claim
            </Link>
          ) : isRedeemed ? (
            <div className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[15px] font-semibold" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
              <IconCircleCheck size={18} /> Redeemed — deal used
            </div>
          ) : alreadyClaimed && existingQrCode ? (
            <button
              onClick={() => onViewExisting?.(existingQrCode)}
              className="w-full py-3.5 rounded-2xl transition-opacity text-[16px] font-bold text-white hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: '#16A34A' }}
            >
              <IconCircleCheck size={18} /> View QR code
            </button>
          ) : (() => {
            const mode: 'now' | 'schedule' = (scheduling || isFutureDay) ? 'schedule' : 'now';
            const label = mode === 'schedule'
              ? (claiming ? 'Reserving…' : 'Reserve deal')
              : (claiming ? 'Claiming…' : 'Claim now');
            return (
              <button
                onClick={dailyLimitReached ? undefined : () => submitClaim(mode)}
                disabled={claiming || dailyLimitReached}
                className="w-full py-3.5 rounded-2xl transition-opacity text-[16px] font-bold text-white"
                style={{ background: CUSTOMER_UI.accent, opacity: dailyLimitReached ? 0.4 : 1, cursor: dailyLimitReached ? 'default' : 'pointer' }}
              >
                {label}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
