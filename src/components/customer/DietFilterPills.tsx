'use client';

import { CUSTOMER_UI } from '@/lib/customerUI';

export type DietFilter = 'all' | 'veg' | 'egg' | 'nonveg';

const OPTIONS = [
  { id: 'veg'    as const, label: 'Veg',     dot: '#22C55E' },
  { id: 'egg'    as const, label: 'Egg',     dot: '#EAB308' },
  { id: 'nonveg' as const, label: 'Non-Veg', dot: '#EF4444' },
];

interface DietFilterPillsProps {
  value:    DietFilter;
  onChange: (v: DietFilter) => void;
  className?: string;
}

export default function DietFilterPills({ value, onChange, className = '' }: DietFilterPillsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {OPTIONS.map(({ id, label, dot }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(active ? 'all' : id)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all"
            style={
              active
                ? { background: `${dot}22`, border: `1px solid ${dot}`, color: CUSTOMER_UI.textPrimary }
                : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }
            }
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
