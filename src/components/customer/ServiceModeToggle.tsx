'use client';

import { CUSTOMER_UI } from '@/lib/customerUI';
import type { ServiceMode } from '@/lib/discoverFilters';

interface ServiceModeToggleProps {
  value:    ServiceMode;
  onChange: (v: ServiceMode) => void;
}

export default function ServiceModeToggle({ value, onChange }: ServiceModeToggleProps) {
  const modes: { id: ServiceMode; label: string }[] = [
    { id: 'dine-in', label: 'Dine-in' },
    { id: 'pickup',  label: 'Pickup' },
  ];

  return (
    <div
      className="flex rounded-xl p-0.5 flex-shrink-0"
      style={{ background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}` }}
    >
      {modes.map(m => {
        const active = value === m.id;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(active ? 'all' : m.id)}
            className="px-3 py-1.5 rounded-[10px] text-[12px] font-semibold transition-all whitespace-nowrap"
            style={
              active
                ? { background: 'rgba(255,255,255,0.12)', color: CUSTOMER_UI.textPrimary }
                : { color: CUSTOMER_UI.textMuted }
            }
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
