// Timezone helpers — kept byte-identical to the claim-deal edge function and the
// mobile app (src/lib/appTime.ts), so day/month boundaries agree across web,
// mobile, and the backend. DST-safe; no external deps.

export const APP_TZ = 'America/Toronto';

interface ZonedParts { year: number; month: number; day: number; hour: number; minute: number; second: number }

/** Wall-clock parts of `date` in `timeZone`. */
function zonedParts(date: Date, timeZone: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = {} as Record<string, number>;
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== 'literal') p[part.type] = Number(part.value);
  }
  return p as unknown as ZonedParts;
}

/** UTC Date for a given wall-clock time in `timeZone` (DST-safe via offset correction). */
function zonedWallToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, timeZone: string): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const p = zonedParts(new Date(guess), timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const offset = asUtc - guess; // zone is `offset` ms ahead of UTC
  return new Date(guess - offset);
}

/** The UTC instant of the start of the current day in `timeZone`. */
export function startOfDayInTZ(timeZone: string = APP_TZ, now: Date = new Date()): Date {
  const p = zonedParts(now, timeZone);
  return zonedWallToUtc(p.year, p.month, p.day, 0, 0, 0, timeZone);
}

/** The UTC instant of the start of the current month in `timeZone`. */
export function startOfMonthInTZ(timeZone: string = APP_TZ, now: Date = new Date()): Date {
  const p = zonedParts(now, timeZone);
  return zonedWallToUtc(p.year, p.month, 1, 0, 0, 0, timeZone);
}

/** True if `iso` falls on today's calendar date in `timeZone`. */
export function isTodayInTZ(iso: string | null | undefined, timeZone: string = APP_TZ, now: Date = new Date()): boolean {
  if (!iso) return false;
  const a = zonedParts(new Date(iso), timeZone);
  const b = zonedParts(now, timeZone);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
