// Timezone helpers — keep the website's day boundary identical to the claim-deal
// edge function (America/Toronto), so redemption counters / "redeemed today" tags
// never disagree between web, mobile, and the backend.

export const APP_TZ = 'America/Toronto';

/** Milliseconds that the given zone is ahead of UTC at `date` (negative = behind). */
function tzOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = dtf.formatToParts(date).reduce((a, x) => { a[x.type] = x.value; return a; }, {} as Record<string, string>);
  let hour = parseInt(p.hour, 10);
  if (hour === 24) hour = 0; // some engines render midnight as 24
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second);
  return asUTC - date.getTime();
}

/** The UTC instant of the start of the current day in `timeZone`. */
export function startOfDayInTZ(timeZone: string = APP_TZ, now: Date = new Date()): Date {
  const dtf = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const p = dtf.formatToParts(now).reduce((a, x) => { a[x.type] = x.value; return a; }, {} as Record<string, string>);
  const wallMidnightAsUTC = Date.UTC(+p.year, +p.month - 1, +p.day, 0, 0, 0);
  return new Date(wallMidnightAsUTC - tzOffsetMs(timeZone, now));
}

/** True if `iso` falls on today's date in `timeZone`. */
export function isTodayInTZ(iso: string | null | undefined, timeZone: string = APP_TZ, now: Date = new Date()): boolean {
  if (!iso) return false;
  const start = startOfDayInTZ(timeZone, now).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  const t = new Date(iso).getTime();
  return t >= start && t < end;
}
