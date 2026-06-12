'use client';

// Customer Claims — Active / Waiting / History (mobile parity)
// Active   = status 'claimed' (timer running, live QR)
// Waiting  = status 'scheduled' (reserved, timer not started yet)
// History  = redeemed / expired / reverted(cancelled), filterable

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconStar, IconQrcode, IconClock, IconChevronRight,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { useCustomerPoints } from '@/hooks/useCustomerPoints';
import { usePlan } from '@/hooks/usePlan';
import { VanishingQR } from '@/components/deals/VanishingQR';
import CustomerPortalHeader from '@/components/customer/CustomerPortalHeader';
import LocationModal from '@/components/customer/LocationModal';
import { useCustomerLocation } from '@/hooks/useCustomerLocation';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { formatCustomerDealTitle } from '@/lib/utils';

interface ClaimRow {
  id:              string;
  qr_code:         string;
  status:          string;
  claimed_at:      string;
  redeemed_at:     string | null;
  expires_at:      string | null;
  claim_for_date:  string | null;
  timer_starts_at: string | null;
  window_minutes:  number | null;
  deal: {
    title:          string;
    emoji:          string;
    discount_value: string | null;
    restaurant: { name: string; address: string | null } | null;
  } | null;
}

type HistoryFilter = 'all' | 'redeemed' | 'expired' | 'cancelled';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Live countdown chip ──────────────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string | null }) {
  const getMs = () => (expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0);
  const [ms, setMs] = useState(getMs);
  useEffect(() => {
    const id = setInterval(() => setMs(getMs()), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (ms <= 0) return <span className="text-[12px] font-bold" style={{ color: '#f87171' }}>Expired</span>;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const label = h > 0 ? `${h}h ${m}m` : `${m}m ${String(s).padStart(2, '0')}s`;
  return <span className="text-[12px] font-bold tabular-nums" style={{ color: CUSTOMER_UI.claimBlue }}>{label}</span>;
}

function QrModal({ claim, onClose }: { claim: ClaimRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-[340px] rounded-2xl pt-6 pb-5 px-5 text-center animate-[slideUp_0.22s_ease]"
        style={{ background: CUSTOMER_UI.bgElevated, color: CUSTOMER_UI.textPrimary, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
      >
        <h3 className="font-display text-[17px] font-bold leading-tight">
          {claim.deal?.emoji} {formatCustomerDealTitle(claim.deal?.title)}
        </h3>
        <p className="text-[12px] mb-4" style={{ color: CUSTOMER_UI.textSecondary }}>{claim.deal?.restaurant?.name}</p>
        <VanishingQR claimId={claim.id} />
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 rounded-xl text-[14px] font-bold text-white"
          style={{ background: CUSTOMER_UI.accent }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function CustomerClaimsPage() {
  const router    = useRouter();
  const supabase  = useRef(createClient()).current;
  const plan      = usePlan();
  const points    = useCustomerPoints(plan.tier);
  const { city, radius, applyLocation } = useCustomerLocation();
  const [showLocation, setShowLocation] = useState(false);
  const [dietFilter, setDietFilter] = useState<'veg' | 'all'>('veg');

  const [claims,   setClaims]   = useState<ClaimRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [authed,   setAuthed]   = useState<boolean | null>(null);
  const [filter,   setFilter]   = useState<HistoryFilter>('all');
  const [qrClaim,  setQrClaim]  = useState<ClaimRow | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/customer/login'); return; }
      setAuthed(true);
    });
  }, [supabase, router]);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/claims')
      .then(r => r.json())
      .then(({ data }: { data?: ClaimRow[] }) => setClaims(data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (authed) load(); }, [authed, load]);

  const handleCancel = async (claim: ClaimRow) => {
    // Optimistic — mark reverted locally; backend revert via claims revert endpoint
    setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'reverted' } : c));
    try {
      await fetch(`/api/claims/revert/${claim.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User cancelled scheduled claim' }),
      });
    } catch { /* ignore — already optimistic */ }
  };

  const active   = claims.filter(c => c.status === 'claimed');
  const waiting  = claims.filter(c => c.status === 'scheduled');
  const history  = claims.filter(c => ['redeemed', 'expired', 'reverted'].includes(c.status));

  const historyCounts = {
    all:       history.length,
    redeemed:  history.filter(c => c.status === 'redeemed').length,
    expired:   history.filter(c => c.status === 'expired').length,
    cancelled: history.filter(c => c.status === 'reverted').length,
  };

  const filteredHistory = filter === 'all'
    ? history
    : filter === 'cancelled'
    ? history.filter(c => c.status === 'reverted')
    : history.filter(c => c.status === filter);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CUSTOMER_UI.bg }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CUSTOMER_UI.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: CUSTOMER_UI.bg, color: CUSTOMER_UI.textPrimary }}>
      {!plan.loading && (
        <CustomerPortalHeader
          city={city}
          radiusKm={radius}
          tier={plan.tier}
          dailyUsed={plan.daily_used}
          effectiveDailyCap={plan.effective_daily_cap}
          pointsBalance={plan.points_balance}
          vegMode={dietFilter === 'veg'}
          onVegModeChange={(veg) => setDietFilter(veg ? 'veg' : 'all')}
          onLocationClick={() => setShowLocation(true)}
        />
      )}

      <main className="max-w-[700px] mx-auto px-4 py-2 space-y-7">
        <p className="text-[13px] -mt-1" style={{ color: CUSTOMER_UI.textSecondary }}>My Claims</p>

        {/* Points banner */}
        <Link
          href="/customer/points"
          className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
          style={{ background: CUSTOMER_UI.accentSoft, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
        >
          <IconStar size={18} style={{ color: CUSTOMER_UI.gold }} />
          <span className="flex-1 text-[14px] font-bold">
            RepEAT Points · {points.balance} · <span style={{ color: CUSTOMER_UI.textSecondary, fontWeight: 500 }}>Redeem rewards</span>
          </span>
          <IconChevronRight size={16} style={{ color: CUSTOMER_UI.textMuted }} />
        </Link>

        {/* Active */}
        <section>
          <h2 className="font-display text-[20px] font-extrabold mb-3">Active</h2>
          {loading ? (
            <div className="h-28 rounded-2xl animate-pulse" style={{ background: CUSTOMER_UI.glassBg }} />
          ) : active.length === 0 ? (
            <div
              className="rounded-2xl px-5 py-10 text-center"
              style={{ background: CUSTOMER_UI.glassBg, border: `1px dashed ${CUSTOMER_UI.glassBorder}` }}
            >
              <IconQrcode size={30} className="mx-auto mb-3" style={{ color: CUSTOMER_UI.textMuted }} />
              <p className="text-[15px] font-bold">No active claims</p>
              <p className="text-[13px] mt-1" style={{ color: CUSTOMER_UI.textSecondary }}>
                Claim a deal to unlock your unique QR code
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {active.map(c => (
                <div key={c.id} className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.claimBlue}55` }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate">{c.deal?.restaurant?.name} · {formatCustomerDealTitle(c.deal?.title)}</p>
                    <p className="text-[12px] mt-0.5 flex items-center gap-1.5" style={{ color: CUSTOMER_UI.claimBlue }}>
                      <IconClock size={12} /> <Countdown expiresAt={c.expires_at} /> left
                    </p>
                  </div>
                  <button
                    onClick={() => setQrClaim(c)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-white"
                    style={{ background: CUSTOMER_UI.accent }}
                  >
                    <IconQrcode size={14} /> Show QR
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Waiting */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-[20px] font-extrabold">Waiting</h2>
            {waiting.length > 0 && (
              <span className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full" style={{ background: `${CUSTOMER_UI.claimBlue}22`, color: CUSTOMER_UI.claimBlue }}>
                <IconClock size={12} /> {waiting.length} upcoming
              </span>
            )}
          </div>
          <p className="text-[13px] mb-3" style={{ color: CUSTOMER_UI.textSecondary }}>
            Reserved deals that start at your scheduled time — the timer hasn&apos;t begun yet.
          </p>
          {waiting.length === 0 ? (
            <p className="text-[13px]" style={{ color: CUSTOMER_UI.textMuted }}>No scheduled claims.</p>
          ) : (
            <div className="space-y-2.5">
              {waiting.map(c => (
                <div key={c.id} className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] truncate">{c.deal?.restaurant?.name} · {formatCustomerDealTitle(c.deal?.title)}</p>
                    <p className="text-[12px] mt-0.5 flex items-center gap-1.5">
                      <IconClock size={12} style={{ color: CUSTOMER_UI.claimBlue }} />
                      <span style={{ color: CUSTOMER_UI.claimBlue, fontWeight: 700 }}>{formatTime(c.timer_starts_at)}</span>
                      <button onClick={() => setQrClaim(c)} className="font-bold" style={{ color: CUSTOMER_UI.accent }}>· Show your QR</button>
                    </p>
                  </div>
                  <button onClick={() => handleCancel(c)} className="text-[13px] font-semibold" style={{ color: CUSTOMER_UI.textSecondary }}>
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* History */}
        <section>
          <h2 className="font-display text-[20px] font-extrabold mb-3">History</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-none mb-3 p-1 rounded-xl" style={{ background: CUSTOMER_UI.glassBg }}>
            {([
              ['all', `All ${historyCounts.all}`],
              ['redeemed', `Redeemed ${historyCounts.redeemed}`],
              ['expired', `Expired`],
              ['cancelled', `Cancelled ${historyCounts.cancelled}`],
            ] as const).map(([id, label]) => {
              const active = filter === id;
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                  style={active
                    ? { background: 'rgba(255,255,255,0.1)', color: CUSTOMER_UI.accent }
                    : { color: CUSTOMER_UI.textSecondary }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-[13px]" style={{ color: CUSTOMER_UI.textMuted }}>Nothing here yet.</p>
          ) : (
            <div className="space-y-2.5">
              {filteredHistory.map(c => (
                <div key={c.id} className="rounded-2xl px-4 py-3 flex items-center gap-3" style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(91,155,213,0.15)' }}>
                    <IconClock size={16} style={{ color: CUSTOMER_UI.claimBlue }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[14px] truncate">{c.deal?.restaurant?.name} · {formatCustomerDealTitle(c.deal?.title)}</p>
                    <p className="text-[12px] mt-0.5">
                      <span style={{ color: c.status === 'redeemed' ? '#4ade80' : c.status === 'reverted' ? CUSTOMER_UI.textMuted : CUSTOMER_UI.textSecondary, fontWeight: 600 }}>
                        {c.status === 'redeemed' ? 'Redeemed' : c.status === 'reverted' ? 'Cancelled' : c.status === 'expired' ? 'Expired' : 'Waiting'}
                      </span>
                      <span style={{ color: CUSTOMER_UI.textMuted }}> · {formatDate(c.redeemed_at ?? c.claimed_at)}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {qrClaim && <QrModal claim={qrClaim} onClose={() => setQrClaim(null)} />}

      {showLocation && (
        <LocationModal
          city={city}
          radius={radius}
          onApply={applyLocation}
          onClose={() => setShowLocation(false)}
        />
      )}
    </div>
  );
}
