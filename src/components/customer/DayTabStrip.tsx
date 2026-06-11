'use client';

import { IconLock } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';

export interface DayTabItem {
  key:         string;
  label:       string;
  locked?:     boolean;
  claimable?:  boolean;
  earlyAccess?: boolean;
}

interface DayTabStripProps {
  tabs:       DayTabItem[];
  activeKey:  string;
  onSelect:   (key: string) => void;
  showRestaurants?: boolean;
  restaurantsActive?: boolean;
  onRestaurants?: () => void;
}

export default function DayTabStrip({
  tabs,
  activeKey,
  onSelect,
  showRestaurants = true,
  restaurantsActive = false,
  onRestaurants,
}: DayTabStripProps) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 -mx-1 px-1">
      {tabs.map(tab => {
        const active = activeKey === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className="flex-shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5"
            style={
              active
                ? { background: CUSTOMER_UI.accent, color: '#fff', boxShadow: `0 4px 16px ${CUSTOMER_UI.accent}44` }
                : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }
            }
          >
            {tab.label}
            {tab.locked && <IconLock size={11} style={{ color: CUSTOMER_UI.gold }} />}
            {!tab.locked && tab.earlyAccess && (
              <span className="text-[8px] font-bold uppercase opacity-80">+</span>
            )}
          </button>
        );
      })}
      {showRestaurants && (
        <button
          type="button"
          onClick={onRestaurants}
          className="flex-shrink-0 h-9 px-4 rounded-full text-[13px] font-semibold transition-all"
          style={
            restaurantsActive
              ? { background: CUSTOMER_UI.accent, color: '#fff' }
              : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }
          }
        >
          Restaurants
        </button>
      )}
    </div>
  );
}
