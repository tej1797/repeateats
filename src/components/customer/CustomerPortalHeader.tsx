'use client';

import type { ReactNode } from 'react';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { IconChevronDown, IconClock, IconStar } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { RepEATLogo } from '@/components/RepEATLogo';
import VegModeToggle from '@/components/customer/VegModeToggle';
import DiscoverTopNav from '@/components/customer/DiscoverTopNav';

const cellBase: CSSProperties = {
  background:   CUSTOMER_UI.glassBg,
  borderRadius: 10,
  height:       36,
  display:      'flex',
  alignItems:   'center',
  justifyContent: 'center',
  overflow:     'hidden',
};

interface CustomerPortalHeaderProps {
  city:              string;
  radiusKm:          number;
  tier:              string;
  dailyUsed:         number;
  effectiveDailyCap: number;
  pointsBalance:     number;
  vegMode:           boolean;
  onVegModeChange:   (veg: boolean) => void;
  activeClaimTime?:  string | null;
  onLocationClick:   () => void;
  searchSlot?:       ReactNode;
}

export default function CustomerPortalHeader({
  city,
  radiusKm,
  tier,
  dailyUsed,
  effectiveDailyCap,
  pointsBalance,
  vegMode,
  onVegModeChange,
  activeClaimTime,
  onLocationClick,
  searchSlot,
}: CustomerPortalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 glass-bar" style={{ borderBottom: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
      <div className="max-w-[1100px] mx-auto px-4 pt-3 pb-2 space-y-2.5">
        {/* Row 1 — RepEAT + location (left), stats grid (right) */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 min-w-0">
            <Link href="/customer" className="inline-block">
              <RepEATLogo portal="dark" size="sm" planTier={tier} />
            </Link>
            <button
              type="button"
              onClick={onLocationClick}
              className="flex items-center gap-0.5 mt-1.5 max-w-[160px] group"
              style={{ color: CUSTOMER_UI.textSecondary }}
            >
              <span className="text-[11px] font-semibold truncate group-hover:text-tx transition-colors">{city}</span>
              <span className="text-[11px] flex-shrink-0">· {radiusKm} km</span>
              <IconChevronDown size={12} className="flex-shrink-0 opacity-70" />
            </button>
          </div>

          <div className="ml-auto flex-shrink-0" style={{ width: 178 }}>
            <div className="grid" style={{ gridTemplateColumns: '90px 80px', gap: '4px 8px' }}>
              <div style={{ ...cellBase, width: 90, flexDirection: 'column', gap: 0, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: CUSTOMER_UI.accent, lineHeight: 1 }}>
                  {dailyUsed}/{effectiveDailyCap}
                </span>
                <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.06em', color: CUSTOMER_UI.textSecondary, lineHeight: 1.2, marginTop: 2 }}>
                  REDEEMED
                </span>
              </div>
              <div style={{ ...cellBase, width: 80, border: `1px solid ${CUSTOMER_UI.glassBorder}`, padding: '0 3px' }}>
                <VegModeToggle vegMode={vegMode} onChange={onVegModeChange} />
              </div>
              <div style={{ ...cellBase, width: 90, gap: 4, border: `1px solid ${CUSTOMER_UI.claimBlue}`, color: CUSTOMER_UI.claimBlue }}>
                {activeClaimTime ? (
                  <>
                    <IconClock size={12} style={{ flexShrink: 0 }} />
                    <span className="truncate" style={{ fontSize: 10, fontWeight: 700 }}>{activeClaimTime}</span>
                  </>
                ) : (
                  <span style={{ fontSize: 9, fontWeight: 600, color: CUSTOMER_UI.textMuted }}>No active</span>
                )}
              </div>
              <Link
                href="/customer/points"
                style={{ ...cellBase, width: 80, gap: 3, textDecoration: 'none', border: `1px solid ${CUSTOMER_UI.accent}`, color: CUSTOMER_UI.accent }}
              >
                <IconStar size={11} stroke={1.8} />
                <span style={{ fontSize: 10, fontWeight: 700 }}>{pointsBalance} pts</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Row 2 — Home / Claims / Profile + search */}
        <div className="flex items-center gap-2 pb-0.5">
          <DiscoverTopNav />
          <div className="flex-1 min-w-0" />
          {searchSlot}
        </div>
      </div>
    </header>
  );
}
