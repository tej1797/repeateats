'use client';

import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';
import { QUICK_DEAL_FILTERS, type QuickDealFilterId } from '@/lib/discoverFilters';
import ServiceModeToggle from '@/components/customer/ServiceModeToggle';
import type { ServiceMode } from '@/lib/discoverFilters';

interface DiscoverFilterBarProps {
  dealType:       QuickDealFilterId;
  onDealType:     (id: QuickDealFilterId) => void;
  serviceMode:    ServiceMode;
  onServiceMode:  (m: ServiceMode) => void;
  onOpenFilters:  () => void;
  filterCount?:   number;
}

export default function DiscoverFilterBar({
  dealType,
  onDealType,
  serviceMode,
  onServiceMode,
  onOpenFilters,
  filterCount = 0,
}: DiscoverFilterBarProps) {
  return (
    <div className="space-y-2.5 mb-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenFilters}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-semibold flex-shrink-0"
          style={{
            background: CUSTOMER_UI.glassBg,
            border: `1px solid ${CUSTOMER_UI.glassBorder}`,
            color: CUSTOMER_UI.textPrimary,
          }}
        >
          <IconAdjustmentsHorizontal size={14} />
          Filters
          {filterCount > 0 && (
            <span
              className="ml-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
              style={{ background: CUSTOMER_UI.accent, color: '#fff' }}
            >
              {filterCount}
            </span>
          )}
        </button>
        <ServiceModeToggle value={serviceMode} onChange={onServiceMode} />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        {QUICK_DEAL_FILTERS.map(opt => {
          const active = dealType === opt.id;
          const icon = 'icon' in opt ? opt.icon : undefined;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onDealType(opt.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap flex-shrink-0 transition-all"
              style={
                active
                  ? { background: CUSTOMER_UI.accent, color: '#fff' }
                  : { background: CUSTOMER_UI.glassBg, border: `1px solid ${CUSTOMER_UI.glassBorder}`, color: CUSTOMER_UI.textSecondary }
              }
            >
              {icon && <span className="text-[11px]">{icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
