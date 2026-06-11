export interface HoursEntry {
  open: string;
  close: string;
  closed: boolean;
}

export const RESTAURANT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

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

export function hoursRecordToEntries(hours: Record<string, string> | null): Record<string, HoursEntry> {
  const result = defaultHours();
  if (!hours) return result;
  for (const day of RESTAURANT_DAYS) {
    const val = hours[day];
    if (!val) continue;
    if (val.toLowerCase() === 'closed') {
      result[day] = { ...result[day], closed: true };
    } else {
      const parts = val.split(/[–\-]/);
      if (parts.length >= 2) {
        result[day] = { open: parts[0].trim(), close: parts[1].trim(), closed: false };
      }
    }
  }
  return result;
}

export function entriesToHoursRecord(entries: Record<string, HoursEntry>): Record<string, string> {
  return Object.fromEntries(
    RESTAURANT_DAYS.map((d) => [
      d,
      entries[d].closed ? 'Closed' : `${entries[d].open}–${entries[d].close}`,
    ]),
  );
}
