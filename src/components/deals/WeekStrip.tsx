'use client';

// WeekStrip — horizontal 7-day calendar for Pro users on the Discover page.
// Shows abbreviated day name, date, and deal count badge per cell.
// Clicking a cell sets the active tab in the parent feed.

import { useMemo } from 'react';

type DayKey = 'today' | 'tomorrow' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DOW_SHORT: Record<string, string> = {
  sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed',
  thu: 'Thu', fri: 'Fri', sat: 'Sat',
};

interface WeekStripProps {
  selectedDay:     DayKey;
  onDaySelect:     (day: DayKey) => void;
  dealCountsByDay: Record<string, number>;
  // 'pro' = 7 cells, 'starter' = 2 cells (today + tomorrow)
  variant:         'pro' | 'starter';
}

export default function WeekStrip({ selectedDay, onDaySelect, dealCountsByDay, variant }: WeekStripProps) {
  const cells = useMemo(() => {
    const todayIdx  = new Date().getDay();
    const todayDate = new Date();
    const cellCount = variant === 'pro' ? 7 : 2;

    return Array.from({ length: cellCount }, (_, i) => {
      const date    = new Date(todayDate);
      date.setDate(todayDate.getDate() + i);
      const dowIdx  = date.getDay();
      const dow     = DOW_KEYS[dowIdx];
      const key: DayKey = i === 0 ? 'today' : i === 1 ? 'tomorrow' : dow;
      const label   = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DOW_SHORT[dow];
      const dateNum = date.getDate();
      const isToday = i === 0;
      const dow_abs = DOW_KEYS[(todayIdx + i) % 7]; // absolute DOW for count lookup
      const countForDay = dealCountsByDay[dow_abs] ?? 0;

      return { key, label, dateNum, count: countForDay, isToday };
    });
  }, [dealCountsByDay, variant]); // eslint-disable-line react-hooks/exhaustive-deps

  const ORANGE = '#FF7A00';
  const BLUE   = '#378ADD';

  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-5 px-5 pb-1">
      {cells.map(({ key, label, dateNum, count, isToday }) => {
        const isSelected = selectedDay === key;
        const accentColor = isToday ? ORANGE : BLUE;

        return (
          <button
            key={key}
            onClick={() => onDaySelect(key)}
            className="flex-shrink-0 flex flex-col items-center gap-1 py-2 px-3 rounded-brands transition-all"
            style={{
              minWidth: 52,
              background:   isSelected ? accentColor : 'transparent',
              border:       isToday && !isSelected ? `1.5px solid ${accentColor}` : '1.5px solid transparent',
              color:        isSelected ? '#fff' : isToday ? accentColor : 'var(--t2)',
            }}
          >
            <span className="text-[11px] font-semibold">{label}</span>
            <span className="font-display text-[16px] font-bold leading-none">{dateNum}</span>
            {count > 0 ? (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  background: isSelected ? 'rgba(255,255,255,0.25)' : `${accentColor}20`,
                  color:      isSelected ? '#fff' : accentColor,
                }}
              >
                {count}
              </span>
            ) : (
              <span className="h-[18px]" /> // placeholder to keep height consistent
            )}
          </button>
        );
      })}
    </div>
  );
}
