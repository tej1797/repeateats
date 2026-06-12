export interface HoursEntry {
  open: string;
  close: string;
  closed: boolean;
}

export const RESTAURANT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const DAY_KEY_MAP: Record<string, (typeof RESTAURANT_DAYS)[number]> = {
  mon: 'Mon', monday: 'Mon',
  tue: 'Tue', tuesday: 'Tue',
  wed: 'Wed', wednesday: 'Wed',
  thu: 'Thu', thursday: 'Thu',
  fri: 'Fri', friday: 'Fri',
  sat: 'Sat', saturday: 'Sat',
  sun: 'Sun', sunday: 'Sun',
  Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat', Sun: 'Sun',
};

function normalizeDayKey(key: string): (typeof RESTAURANT_DAYS)[number] | null {
  return DAY_KEY_MAP[key] ?? DAY_KEY_MAP[key.toLowerCase()] ?? null;
}

function parseHoursString(val: string): HoursEntry | null {
  if (val.toLowerCase() === 'closed') {
    return { open: '10:00', close: '22:00', closed: true };
  }
  const parts = val.split(/[–\-]/);
  if (parts.length >= 2) {
    return { open: parts[0].trim(), close: parts[1].trim(), closed: false };
  }
  return null;
}

export function defaultHours(): Record<string, HoursEntry> {
  return Object.fromEntries(
    RESTAURANT_DAYS.map((d) => [d, { open: '10:00', close: '22:00', closed: false }]),
  );
}

const GOOGLE_DAY_MAP: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu',
  Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun',
};

function to24h(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr.includes(':') ? timeStr : '12:00';
  let hour = parseInt(match[1], 10);
  const min = match[2];
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${hour.toString().padStart(2, '0')}:${min}`;
}

export function parseGoogleHours(weekdayText: string[]): Record<string, HoursEntry> {
  const result = defaultHours();
  for (const line of weekdayText) {
    const colonIdx = line.indexOf(': ');
    if (colonIdx === -1) continue;
    const dayFull = line.slice(0, colonIdx);
    const hoursStr = line.slice(colonIdx + 2);
    const key = GOOGLE_DAY_MAP[dayFull];
    if (!key) continue;
    if (hoursStr === 'Closed') {
      result[key] = { open: '10:00', close: '22:00', closed: true };
    } else if (hoursStr.includes('Open 24 hours')) {
      result[key] = { open: '00:00', close: '23:59', closed: false };
    } else {
      const parts = hoursStr.split(/\s*[–\-]\s*/);
      if (parts.length >= 2) {
        result[key] = { open: to24h(parts[0].trim()), close: to24h(parts[1].trim()), closed: false };
      }
    }
  }
  return result;
}

export function hoursRecordToEntries(
  hours: Record<string, string | HoursEntry> | null,
): Record<string, HoursEntry> {
  const result = defaultHours();
  if (!hours) return result;

  for (const [rawDay, val] of Object.entries(hours)) {
    const day = normalizeDayKey(rawDay);
    if (!day) continue;

    if (typeof val === 'object' && val !== null && 'open' in val) {
      result[day] = val as HoursEntry;
      continue;
    }

    if (typeof val !== 'string') continue;
    const parsed = parseHoursString(val);
    if (parsed) result[day] = parsed;
  }
  return result;
}

/** Ordered list of days that have hours stored in the DB record. */
export function hoursForDisplay(
  hours: Record<string, string | HoursEntry> | null,
): Array<{ day: string; entry: HoursEntry }> {
  if (!hours || Object.keys(hours).length === 0) return [];
  const entries = hoursRecordToEntries(hours);
  const present = new Set(
    Object.keys(hours).map(normalizeDayKey).filter(Boolean) as string[],
  );
  return RESTAURANT_DAYS
    .filter((d) => present.has(d))
    .map((day) => ({ day, entry: entries[day] }));
}

export function entriesToHoursRecord(entries: Record<string, HoursEntry>): Record<string, string> {
  return Object.fromEntries(
    RESTAURANT_DAYS.map((d) => [
      d,
      entries[d].closed ? 'Closed' : `${entries[d].open}–${entries[d].close}`,
    ]),
  );
}
