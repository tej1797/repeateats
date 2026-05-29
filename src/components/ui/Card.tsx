'use client';

import type { ReactNode, HTMLAttributes } from 'react';

type Variant = 'default' | 'elevated' | 'glass' | 'outlined';
type Hover   = 'none' | 'lift' | 'glow';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?:  Variant;
  hover?:    Hover;
  padding?:  boolean;
  children:  ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  default:  'bg-surface border border-[var(--bd)] shadow-brand',
  elevated: 'bg-surface border border-[var(--bd)] shadow-brand2',
  glass:    'bg-white/10 backdrop-blur-md border border-white/15',
  outlined: 'bg-transparent border border-[var(--bd)]',
};

const HOVER_CLASSES: Record<Hover, string> = {
  none: '',
  lift: 'cursor-pointer hover:-translate-y-1 hover:shadow-cardHover transition-all duration-200',
  glow: 'cursor-pointer hover:shadow-glow hover:border-[#E85D04]/40 transition-all duration-200',
};

export default function Card({
  variant = 'default',
  hover   = 'none',
  padding = true,
  children,
  className = '',
  ...rest
}: CardProps) {
  return (
    <div
      {...rest}
      className={[
        'rounded-brand overflow-hidden',
        VARIANT_CLASSES[variant],
        HOVER_CLASSES[hover],
        padding ? 'p-5' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
