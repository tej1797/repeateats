// Deal schedule helpers — must match mobile src/lib/dealVisibility.ts day logic.

import { BROWSE_DAYS } from './tierLimits';
import { getBrowseDayTabs } from './dealVisibility';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** YYYY-MM-DD for today + offset days. */
export function dateForOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type SchedulableDeal = {
  available_days?: string[] | null;
  valid_from?:    string | null;
  valid_until?:   string | null;
};

/** True if the deal is active on today + offset (date range + day-of-week). */
export function dealRunsOnOffset(deal: SchedulableDeal, offset: number): boolean {
  const iso = dateForOffset(offset);
  if (deal.valid_from && iso < deal.valid_from) return false;
  if (deal.valid_until && iso > deal.valid_until) return false;

  const days = deal.available_days ?? ['all'];
  if (!days.length || days.includes('all')) return true;

  const d = new Date();
  d.setDate(d.getDate() + offset);
  const dow = DOW_KEYS[d.getDay()];
  return days.some(day => day.toLowerCase() === dow || day === capFirst(dow));
}

/** First claimable offset within tier window where the deal runs, or null. */
export function firstClaimableOffset(
  deal: SchedulableDeal,
  tier: string,
  tomorrowUnlockActive = false,
): number | null {
  const tabs = getBrowseDayTabs(tier, tomorrowUnlockActive);
  for (const tab of tabs) {
    if (tab.claimable && dealRunsOnOffset(deal, tab.offset)) return tab.offset;
  }
  return null;
}

/** Offsets 1..6 where the deal runs (browse preview, "coming up this week"). */
export function comingUpOffsets(deal: SchedulableDeal): number[] {
  const out: number[] = [];
  for (let off = 1; off < BROWSE_DAYS; off++) {
    if (dealRunsOnOffset(deal, off)) out.push(off);
  }
  return out;
}
