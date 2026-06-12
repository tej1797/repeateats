'use client';

interface VegModeToggleProps {
  vegMode:  boolean;
  onChange: (veg: boolean) => void;
}

export default function VegModeToggle({ vegMode, onChange }: VegModeToggleProps) {
  const accent = vegMode ? '#22C55E' : '#EF4444';

  return (
    <button
      type="button"
      onClick={() => onChange(!vegMode)}
      className="flex items-center gap-1.5 w-full h-full px-1"
      aria-pressed={vegMode}
      style={{ cursor: 'pointer' }}
    >
      <span
        className="uppercase tracking-wide leading-none text-center"
        style={{ fontSize: 6.5, fontWeight: 700, color: accent, maxWidth: 34 }}
      >
        {vegMode ? 'Veg Mode' : 'Non-Veg Mode'}
      </span>
      <span
        className="relative flex-shrink-0"
        style={{
          width: 28,
          height: 14,
          borderRadius: 7,
          background: vegMode ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
          border: `1px solid ${accent}`,
          transition: 'background 0.2s',
        }}
      >
        <span
          style={{
            position:      'absolute',
            top:           1,
            left:          vegMode ? 14 : 1,
            width:         10,
            height:        10,
            borderRadius:  '50%',
            background:    accent,
            transition:    'left 0.2s',
            boxShadow:     '0 1px 3px rgba(0,0,0,0.4)',
          }}
        />
      </span>
    </button>
  );
}
