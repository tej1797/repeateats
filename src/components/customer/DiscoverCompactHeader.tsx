'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { IconClock, IconLock, IconStar } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { RepEATLogo } from '@/components/RepEATLogo';
import VegModeToggle from '@/components/customer/VegModeToggle';

interface DiscoverCompactHeaderProps {
  city:              string;
  radiusKm:          number;
  tier:              string;
  dailyUsed:         number;
  effectiveDailyCap: number;
  pointsBalance:     number;
  vegMode:           boolean;
  onVegModeChange:   (veg: boolean) => void;
  activeClaimTime?:  string | null;
}

const cellBase: CSSProperties = {
  background:   CUSTOMER_UI.glassBg,
  borderRadius: 10,
  height:       36,
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  overflow:     'hidden',
};

export default function DiscoverCompactHeader({
  city,
  radiusKm,
  tier,
  dailyUsed,
  effectiveDailyCap,
  pointsBalance,
  vegMode,
  onVegModeChange,
  activeClaimTime,
}: DiscoverCompactHeaderProps) {
  return (
    <div className="mb-2">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 min-w-0">
          <RepEATLogo portal="dark" size="sm" planTier={tier} />
          <div className="flex items-center gap-1 mt-1.5" style={{ color: CUSTOMER_UI.textSecondary }}>
            <span className="text-[11px] truncate">{city}</span>
            <span className="text-[11px]">· {radiusKm} km</span>
          </div>
        </div>

        {/* 2×2 grid — right column 170px */}
        <div className="ml-auto flex-shrink-0" style={{ width: 178 }}>
          <div className="grid" style={{ gridTemplateColumns: '90px 80px', gap: '4px 8px' }}>
            {/* Redeem bar — orange numbers, REDEEMED label */}
            <div
              style={{
                ...cellBase,
                width: 90,
                flexDirection: 'column',
                gap: 0,
                border: `1px solid ${CUSTOMER_UI.glassBorder}`,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: CUSTOMER_UI.accent, lineHeight: 1 }}>
                {dailyUsed}/{effectiveDailyCap}
              </span>
              <span
                style={{
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: CUSTOMER_UI.textSecondary,
                  lineHeight: 1.2,
                  marginTop: 2,
                }}
              >
                REDEEMED
              </span>
            </div>

            {/* Veg mode toggle */}
            <div
              style={{
                ...cellBase,
                width: 80,
                border: `1px solid ${CUSTOMER_UI.glassBorder}`,
                padding: '0 3px',
              }}
            >
              <VegModeToggle vegMode={vegMode} onChange={onVegModeChange} />
            </div>

            {/* Active claim timer — blue */}
            <div
              style={{
                ...cellBase,
                width: 90,
                gap: 4,
                border: `1px solid ${CUSTOMER_UI.claimBlue}`,
                color: CUSTOMER_UI.claimBlue,
              }}
            >
              {activeClaimTime ? (
                <>
                  <IconClock size={12} style={{ flexShrink: 0 }} />
                  <span className="truncate" style={{ fontSize: 10, fontWeight: 700 }}>
                    {activeClaimTime}
                  </span>
                </>
              ) : (
                <span style={{ fontSize: 9, fontWeight: 600, color: CUSTOMER_UI.textMuted }}>
                  No active
                </span>
              )}
            </div>

            {/* Points — orange border + star */}
            <Link
              href="/customer/points"
              style={{
                ...cellBase,
                width: 80,
                gap: 3,
                textDecoration: 'none',
                border: `1px solid ${CUSTOMER_UI.accent}`,
                color: CUSTOMER_UI.accent,
              }}
            >
              <IconStar size={11} stroke={1.8} />
              <span style={{ fontSize: 10, fontWeight: 700 }}>{pointsBalance} pts</span>
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
