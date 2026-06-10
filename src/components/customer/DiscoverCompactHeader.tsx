'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { IconMapPin, IconClock, IconLock } from '@tabler/icons-react';
import { CUSTOMER_UI, METALLIC_GOLD, METALLIC_SILVER } from '@/lib/customerUI';
import { RepEATLogo } from '@/components/RepEATLogo';

interface DiscoverCompactHeaderProps {
  city:              string;
  radiusKm:          number;
  tier:              string;
  dailyUsed:         number;
  effectiveDailyCap: number;
  pointsBalance:     number;
  dietFilter:        'all' | 'veg' | 'nonveg';
  onDietChange:      (v: 'all' | 'veg' | 'nonveg') => void;
  activeClaimLabel?: string | null;
}

const glassBar: CSSProperties = {
  background:   CUSTOMER_UI.glassBg,
  border:       `1px solid ${CUSTOMER_UI.glassBorder}`,
  borderRadius: 14,
  height:       28,
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  fontSize:     11,
  fontWeight:   600,
  color:        CUSTOMER_UI.textPrimary,
};

export default function DiscoverCompactHeader({
  city,
  radiusKm,
  tier,
  dailyUsed,
  effectiveDailyCap,
  pointsBalance,
  dietFilter,
  onDietChange,
  activeClaimLabel,
}: DiscoverCompactHeaderProps) {
  const planTag = tier === 'pro' || tier === 'yearly'
    ? { label: 'pro', color: METALLIC_GOLD.base }
    : tier === 'starter'
    ? { label: 'starter', color: METALLIC_SILVER.base }
    : null;

  const isVeg = dietFilter === 'veg';

  return (
    <div className="mb-3">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <RepEATLogo portal="customer" size="sm" />
            {planTag && (
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ color: planTag.color, background: `${planTag.color}22` }}
              >
                {planTag.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1" style={{ color: CUSTOMER_UI.textSecondary }}>
            <IconMapPin size={12} />
            <span className="text-[11px]">{city} · {radiusKm} km</span>
          </div>
        </div>

        {/* 2×2 grid — right column 170px */}
        <div className="ml-auto" style={{ width: 170 }}>
          <div className="grid" style={{ gridTemplateColumns: '90px 72px', gap: '3px 8px' }}>
            <div style={{ ...glassBar, width: 90 }}>
              {dailyUsed}/{effectiveDailyCap}{' '}
              <span style={{ color: CUSTOMER_UI.textMuted, fontWeight: 500 }}>redeemed</span>
            </div>

            <button
              type="button"
              onClick={() => onDietChange(isVeg ? 'all' : 'veg')}
              style={{ ...glassBar, width: 72, cursor: 'pointer' }}
              aria-pressed={isVeg}
            >
              <span style={{ fontSize: 9, lineHeight: 1.1, textAlign: 'center' }}>
                {isVeg ? 'Veg' : 'Non-Veg'}
              </span>
            </button>

            <div style={{ ...glassBar, width: 90, gap: 4 }}>
              {activeClaimLabel ? (
                <>
                  <IconClock size={11} style={{ color: CUSTOMER_UI.accent }} />
                  <span className="truncate">{activeClaimLabel}</span>
                </>
              ) : (
                <span style={{ color: CUSTOMER_UI.textMuted }}>No active</span>
              )}
            </div>

            <Link
              href="/customer/points"
              style={{ ...glassBar, width: 72, textDecoration: 'none', color: CUSTOMER_UI.gold }}
            >
              ☆ {pointsBalance} pts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LockedDayTeaser({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
      style={{ background: 'rgba(255,191,0,0.12)', color: CUSTOMER_UI.gold }}
    >
      <IconLock size={10} />
      {label}
    </span>
  );
}
