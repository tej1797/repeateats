'use client';

import { useEffect, type ReactNode } from 'react';
import { IconX } from '@tabler/icons-react';

type Size = 'sm' | 'md' | 'lg' | 'full';

interface ModalProps {
  open:      boolean;
  onClose:   () => void;
  title?:    string;
  size?:     Size;
  children:  ReactNode;
  className?: string;
}

const SIZE_CLASSES: Record<Size, string> = {
  sm:   'max-w-[400px]',
  md:   'max-w-[500px]',
  lg:   'max-w-[640px]',
  full: 'max-w-full min-h-screen',
};

export default function Modal({
  open, onClose, title, size = 'md', children, className = '',
}: ModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div
        className={[
          'relative w-full bg-surface rounded-t-[20px] sm:rounded-brand shadow-brand2',
          'max-h-[95vh] overflow-y-auto',
          'animate-[slideUp_0.25s_ease]',
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
        role="dialog"
        aria-modal
        aria-label={title}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--bd)]">
            <h2 className="font-display font-bold text-[17px]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors"
              aria-label="Close"
            >
              <IconX size={14} />
            </button>
          </div>
        )}

        {/* Close button without title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/25 flex items-center justify-center text-white hover:bg-black/40 transition-colors"
            aria-label="Close"
          >
            <IconX size={14} />
          </button>
        )}

        {children}
      </div>
    </div>
  );
}
