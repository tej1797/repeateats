// Browse vs claim window logic — must match mobile src/lib/dealVisibility.ts

import { BROWSE_DAYS, getTierLimits } from './tierLimits';

export interface DayTab {
  key:        string;
  label:      string;
  offset:     number;
  claimable:  boolean;
  locked:     boolean;
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Everyone browses 7 days; only days within tier claim lookahead are claimable. */
export function getBrowseDayTabs(effectiveTier: string, tomorrowUnlockActive = false): DayTab[] {
  const lookahead = getTierLimits(effectiveTier).claimLookaheadDays;
  const effectiveLookahead = tomorrowUnlockActive && effectiveTier === 'free'
    ? lookahead + 1
    : lookahead;

  const tabs: DayTab[] = [];
  const today = new Date();

  for (let i = 0; i < BROWSE_DAYS; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();

    let label: string;
    if (i === 0)      label = 'Today';
    else if (i === 1) label = 'Tomorrow';
    else              label = DOW_LABELS[dow];

    tabs.push({
      key:       i === 0 ? 'today' : i === 1 ? 'tomorrow' : DOW_LABELS[dow].toLowerCase(),
      label,
      offset:    i,
      claimable: i < effectiveLookahead,
      locked:    i >= effectiveLookahead,
    });
  }

  return tabs;
}
