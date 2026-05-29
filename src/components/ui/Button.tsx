'use client';

import { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'portal';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:    Variant;
  size?:       Size;
  loading?:    boolean;
  icon?:       ReactNode;
  iconRight?:  ReactNode;
  portalColor?: string; // hex — used when variant='portal'
  children?:   ReactNode;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm:  'h-9  px-3.5 text-[13px] gap-1.5',
  md:  'h-11 px-5   text-[14px] gap-2',
  lg:  'h-13 px-6   text-[15px] gap-2.5',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:   'bg-[#E85D04] hover:bg-[#C84E03] text-white shadow-sm',
  secondary: 'bg-surface2 hover:bg-[var(--bd2)] text-tx border border-[var(--bd)]',
  danger:    'bg-red-600 hover:bg-red-700 text-white shadow-sm',
  ghost:     'bg-transparent hover:bg-surface2 text-t2 hover:text-tx',
  portal:    'text-white shadow-sm', // bg set via style prop
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  portalColor,
  children,
  className = '',
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const portalStyle = variant === 'portal' && portalColor
    ? { backgroundColor: portalColor, ...style }
    : style;

  return (
    <button
      {...rest}
      disabled={isDisabled}
      style={portalStyle}
      className={[
        'inline-flex items-center justify-center rounded-brands font-semibold',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D04] focus-visible:ring-offset-2',
        isDisabled ? 'opacity-55 pointer-events-none' : 'cursor-pointer',
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      ].join(' ')}
    >
      {loading ? (
        <IconLoader2 size={size === 'sm' ? 14 : 16} className="animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </button>
  );
}
