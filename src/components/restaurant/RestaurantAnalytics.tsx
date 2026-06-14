'use client';

import { useMemo, useState } from 'react';
import {
  computeRestaurantAnalytics,
  type ClaimRow,
} from '@/lib/restaurantAnalytics';
import { formatDealTitle } from '@/lib/utils';

const BLUE   = '#1249A9';
const GREEN  = '#22C55E';
const ORANGE = '#FF7A30';

interface DealLimitRow {
  id: string;
  max_claims: number | null;
}

interface Props {
  restaurantName: string;
  restaurantCoverUrl?: string | null;
  claims: ClaimRow[];
  activeDealCount: number;
  deals?: DealLimitRow[];
  loading?: boolean;
}

function StatBarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] font-bold flex-shrink-0 w-[72px] truncate" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden min-w-0" style={{ background: '#222' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color, minWidth: count > 0 ? 4 : 0 }}
        />
      </div>
      <span className="text-[11px] font-bold flex-shrink-0 tabular-nums w-6 text-right" style={{ color: '#888' }}>
        {count}
      </span>
    </div>
  );
}

function DealThumb({
  coverUrl,
  emoji,
  name,
}: {
  coverUrl?: string | null;
  emoji: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = coverUrl && !failed;

  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 mt-0.5 overflow-hidden" style={{ background: '#1A1A1A' }}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>{emoji || '🍽️'}</span>
      )}
    </div>
  );
}

export default function RestaurantAnalytics({
  restaurantName,
  restaurantCoverUrl,
  claims,
  activeDealCount,
  deals = [],
  loading = false,
}: Props) {
  const dealLimits = useMemo(
    () => new Map(deals.map((d) => [d.id, { max_claims: d.max_claims }])),
    [deals],
  );

  const { summary, daily, topDeals } = useMemo(
    () => computeRestaurantAnalytics(claims, activeDealCount, 14, dealLimits),
    [claims, activeDealCount, dealLimits],
  );

  const maxBar = Math.max(1, ...daily.map((d) => d.claimed + d.redeemed));

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-24 rounded-2xl animate-pulse" style={{ background: '#141414' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div>
        <h2 className="font-display text-[22px] font-extrabold text-white">Analytics</h2>
        <p className="text-[13px] text-[#888] mt-0.5">
          Last 14 days · {restaurantName}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'ACTIVE DEALS', value: summary.activeDeals, sub: 'live now', accent: BLUE },
          { label: 'REDEEMED', value: summary.redeemedAllTime, sub: 'all time', accent: GREEN },
          { label: 'CLAIMS · 7D', value: summary.claims7d, sub: 'last 7 days', accent: ORANGE },
          { label: 'REDEMPTION', value: `${summary.redemptionPct}%`, sub: 'of all claims', accent: GREEN },
        ].map(({ label, value, sub, accent }) => (
          <div
            key={label}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ background: '#141414', border: '1px solid #222' }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: accent }} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#666] mb-2">{label}</p>
            <p className="font-display text-[28px] font-extrabold text-white leading-none">{value}</p>
            <p className="text-[11px] text-[#666] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[14px] text-white">Claims · last 14 days</h3>
          <div className="flex items-center gap-3 text-[11px] text-[#888]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ORANGE }} /> Claimed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} /> Redeemed</span>
          </div>
        </div>
        <div className="flex items-end gap-1 h-32">
          {daily.map((d) => {
            const claimedH = (d.claimed / maxBar) * 100;
            const redeemedH = (d.redeemed / maxBar) * 100;
            return (
              <div key={d.key} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="w-full flex flex-col justify-end h-24 gap-0.5">
                  {d.redeemed > 0 && (
                    <div
                      className="w-full rounded-t-sm min-h-[2px] transition-all"
                      style={{ height: `${Math.max(redeemedH, d.redeemed > 0 ? 8 : 0)}%`, background: GREEN }}
                    />
                  )}
                  {d.claimed > 0 && (
                    <div
                      className="w-full rounded-t-sm min-h-[2px] transition-all"
                      style={{ height: `${Math.max(claimedH, d.claimed > 0 ? 8 : 0)}%`, background: ORANGE }}
                    />
                  )}
                </div>
                <span className="text-[9px] font-bold text-[#555]">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[14px] text-white">Top deals by redemptions</h3>
          <div className="flex items-center gap-3 text-[11px] text-[#888]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: ORANGE }} /> Claimed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: GREEN }} /> Redeemed</span>
          </div>
        </div>
        {topDeals.length === 0 ? (
          <p className="text-[13px] text-[#666]">No redemptions yet.</p>
        ) : (
          <div className="space-y-4">
            {topDeals.map((deal, i) => {
              const barMax = Math.max(deal.claims, deal.redeemed, 1);
              return (
                <div key={deal.id} className="flex items-start gap-3">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-1"
                    style={{ background: '#222', color: '#888' }}
                  >
                    {i + 1}
                  </span>
                  <DealThumb
                    coverUrl={restaurantCoverUrl}
                    emoji={deal.emoji}
                    name={restaurantName}
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-[13px] font-semibold text-white truncate">{formatDealTitle(deal.title)}</p>
                    <StatBarRow label="Claimed" count={deal.claims} max={barMax} color={ORANGE} />
                    <StatBarRow label="Redeemed" count={deal.redeemed} max={barMax} color={GREEN} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
