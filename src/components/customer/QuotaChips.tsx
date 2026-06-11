'use client';

import { CUSTOMER_UI } from '@/lib/customerUI';

interface QuotaChipProps {
  used:    number;
  limit:   number;
  label:   string;
  onFull?: () => void;
}

function QuotaChip({ used, limit, label, onFull }: QuotaChipProps) {
  const isFull = used >= limit;
  return (
    <button
      type="button"
      onClick={isFull ? onFull : undefined}
      className="inline-flex items-center gap-1 transition-opacity"
      style={{
        background:   isFull ? 'rgba(120,113,108,0.2)' : CUSTOMER_UI.accentSoft,
        border:       `1px solid ${isFull ? CUSTOMER_UI.textMuted : CUSTOMER_UI.accent}`,
        borderRadius: 20,
        padding:      '4px 10px',
        fontSize:     12,
        fontWeight:   600,
        color:        isFull ? CUSTOMER_UI.textMuted : CUSTOMER_UI.accent,
        cursor:       isFull ? 'pointer' : 'default',
        lineHeight:   1,
      }}
    >
      🎟️ {used}/{limit} {label}{isFull && <span style={{ fontSize: 13 }}>→</span>}
    </button>
  );
}

interface QuotaChipsProps {
  dailyUsed:            number;
  dailyLimit:           number;
  monthlyUsed:          number;
  monthlyLimit:         number;
  planLabel?:           string | null;
  onUpgrade?:           () => void;
}

export default function QuotaChips({
  dailyUsed,
  dailyLimit,
  monthlyUsed,
  monthlyLimit,
  planLabel,
  onUpgrade,
}: QuotaChipsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <QuotaChip used={dailyUsed} limit={dailyLimit} label="today" onFull={onUpgrade} />
      <QuotaChip used={monthlyUsed} limit={monthlyLimit} label="this month" onFull={onUpgrade} />
      {planLabel && (
        <span
          className="text-[10px] font-bold uppercase tracking-wide"
          style={{ color: CUSTOMER_UI.gold }}
        >
          {planLabel}
        </span>
      )}
    </div>
  );
}
