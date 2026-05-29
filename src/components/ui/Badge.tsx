'use client';

import type { ReactNode } from 'react';

type Variant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral'
             | 'dineIn' | 'pickup' | 'delivery' | 'coming' | 'custom';
type Size    = 'sm' | 'md';

interface BadgeProps {
  variant?:  Variant;
  size?:     Size;
  children:  ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  brand:   'bg-[#FFF3EC] text-[#E85D04] border-[#FED7B0]',
  success: 'bg-green-50 text-green-700 border-green-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger:  'bg-red-50 text-red-600 border-red-200',
  neutral: 'bg-surface2 text-t2 border-[var(--bd)]',
  dineIn:  'bg-blue-50 text-blue-700 border-blue-200',
  pickup:  'bg-green-50 text-green-700 border-green-200',
  delivery:'bg-orange-50 text-orange-800 border-orange-200',
  coming:  'bg-white/90 text-t2 border-[var(--bd)]',
  custom:  '',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-[11px] px-2 py-0.5',
  md: 'text-[12px] px-2.5 py-1',
};

export default function Badge({
  variant = 'neutral',
  size = 'sm',
  children,
  className = '',
  style,
}: BadgeProps) {
  return (
    <span
      style={style}
      className={[
        'inline-flex items-center gap-1 font-bold rounded-full border',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

// Convenience: deal-type badge that picks variant from the type string
export function DealTypeBadge({ types }: { types: string[] }) {
  const first = types[0] ?? 'dine-in';
  const variantMap: Record<string, Variant> = {
    'dine-in':  'dineIn',
    'pickup':   'pickup',
    'delivery': 'delivery',
  };
  return (
    <Badge variant={variantMap[first] ?? 'neutral'} size="sm">
      {first}
      {types.length > 1 && <span>+{types.length - 1}</span>}
    </Badge>
  );
}
