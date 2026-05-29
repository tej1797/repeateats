'use client';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type Day = typeof DAYS[number];

interface DayPickerProps {
  selectedDays: string[];
  onChange:     (days: string[]) => void;
  className?:   string;
}

export default function DayPicker({ selectedDays, onChange, className = '' }: DayPickerProps) {
  const allSelected = DAYS.every((d) => selectedDays.includes(d));

  const toggleAll = () => {
    onChange(allSelected ? [] : [...DAYS]);
  };

  const toggleDay = (day: Day) => {
    if (selectedDays.includes(day)) {
      // Remove 'all' shortcut when deselecting individual day
      onChange(selectedDays.filter((d) => d !== day && d !== 'all'));
    } else {
      onChange([...selectedDays.filter((d) => d !== 'all'), day]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* All days toggle */}
      <button
        type="button"
        onClick={toggleAll}
        className={[
          'h-9 px-4 rounded-pill text-[13px] font-bold transition-all border',
          allSelected
            ? 'bg-[#E85D04] border-[#E85D04] text-white'
            : 'bg-surface2 border-[var(--bd)] text-t2 hover:border-[#E85D04] hover:text-[#E85D04]',
        ].join(' ')}
      >
        All days
      </button>

      {DAYS.map((day) => {
        const active = selectedDays.includes(day) || allSelected;
        return (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={[
              'h-9 px-3.5 rounded-pill text-[13px] font-bold transition-all border',
              active
                ? 'bg-[#E85D04] border-[#E85D04] text-white'
                : 'bg-surface2 border-[var(--bd)] text-t2 hover:border-[#E85D04] hover:text-[#E85D04]',
            ].join(' ')}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}
