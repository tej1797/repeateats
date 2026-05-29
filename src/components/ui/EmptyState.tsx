'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?:        string | ReactNode;
  title:        string;
  description?: string;
  action?:      () => void;
  actionLabel?: string;
  className?:   string;
}

export default function EmptyState({
  icon = '🍽️',
  title,
  description,
  action,
  actionLabel = 'Try again',
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="text-5xl mb-4 animate-float">
        {icon}
      </div>
      <h3 className="font-display font-bold text-[18px] mb-1.5">{title}</h3>
      {description && (
        <p className="text-[14px] text-t2 max-w-[280px] leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action}
          className="mt-5 h-10 px-5 rounded-brands bg-brand hover:bg-brand2 text-white text-[13px] font-semibold transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
