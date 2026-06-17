// Deal schedule helpers — must match mobile src/lib/dealVisibility.ts day logic.

import { BROWSE_DAYS } from './tierLimits';
import { getBrowseDayTabs } from './dealVisibility';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export type WeekdayLabel = typeof WEEKDAY_LABELS[number];

const WEEKDAY_TO_JS: Record<WeekdayLabel, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

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

type CustomerVisibleDeal = SchedulableDeal & {
  is_active?:    boolean;
  is_coming?:    boolean;
  max_claims?:   number | null;
  current_claims?: number;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDealExpired(deal: SchedulableDeal): boolean {
  if (!deal.valid_until) return false;
  return deal.valid_until < todayISO();
}

function isDealSoldOut(deal: CustomerVisibleDeal): boolean {
  return deal.max_claims != null && deal.max_claims > 0 && (deal.current_claims ?? 0) >= deal.max_claims;
}

/** True if the deal is active on today + offset (date range + day-of-week). */
export function dealRunsOnOffset(deal: SchedulableDeal, offset: number): boolean {
  const iso = dateForOffset(offset);
  if (deal.valid_from && iso < deal.valid_from) return false;
  if (deal.valid_until && iso > deal.valid_until) return false;

  const days = deal.available_days ?? ['all'];
  if (!days.length || days.some(d => ['all', 'everyday', 'daily'].includes(d.toLowerCase()))) return true;

  const d = new Date();
  d.setDate(d.getDate() + offset);
  const dow = DOW_KEYS[d.getDay()];
  return days.some(day => day.toLowerCase() === dow || day === capFirst(dow));
}

/** True if deal is configured for a weekday name (Mon, Tue, …) or every day. */
export function dealConfiguredForWeekday(deal: SchedulableDeal, weekday: WeekdayLabel): boolean {
  const days = deal.available_days ?? ['all'];
  if (!days.length || days.some(d => ['all', 'everyday', 'daily'].includes(d.toLowerCase()))) return true;
  const target = weekday.toLowerCase();
  return days.some((day) => day.toLowerCase() === target || day === weekday);
}

/** True if deal runs on the next occurrence of weekday within the next 14 days. */
export function dealRunsOnWeekday(deal: SchedulableDeal, weekday: WeekdayLabel): boolean {
  const targetDow = WEEKDAY_TO_JS[weekday];
  for (let off = 0; off < 14; off++) {
    const d = new Date();
    d.setDate(d.getDate() + off);
    if (d.getDay() === targetDow && dealRunsOnOffset(deal, off)) return true;
  }
  return false;
}

export type DealScheduleFilter = 'all' | 'today' | 'tomorrow' | WeekdayLabel;

/** Would this deal appear in the customer feed on today + offset? */
export function dealCustomerVisibleOnOffset(deal: CustomerVisibleDeal, offset: number): boolean {
  if (!dealRunsOnOffset(deal, offset)) return false;
  if (!deal.is_active || deal.is_coming) return false;
  if (isDealExpired(deal) || isDealSoldOut(deal)) return false;
  return true;
}

export function dealMatchesScheduleFilter(deal: CustomerVisibleDeal, filter: DealScheduleFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'today') return dealCustomerVisibleOnOffset(deal, 0);
  if (filter === 'tomorrow') return dealCustomerVisibleOnOffset(deal, 1);
  return dealRunsOnWeekday(deal, filter);
}

const DAY_LABEL_BY_KEY: Record<string, WeekdayLabel> = {
  mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun',
};

/** Human-readable schedule for restaurant deal cards. */
export function formatDealScheduleDays(deal: SchedulableDeal): string {
  const days = deal.available_days ?? ['all'];
  if (!days.length || days.includes('all')) return 'Every day';
  return days
    .map((d) => DAY_LABEL_BY_KEY[d.toLowerCase().slice(0, 3)] ?? d)
    .join(', ');
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
