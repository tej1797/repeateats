'use client';

import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react';
import { IconCheck, IconX, IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id:      string;
  type:    ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  warning: (message: string) => void;
  info:    (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TYPE_STYLES: Record<ToastType, { bg: string; text: string; icon: ReactNode }> = {
  success: {
    bg:   'bg-green-600',
    text: 'text-white',
    icon: <IconCheck size={16} />,
  },
  error: {
    bg:   'bg-red-600',
    text: 'text-white',
    icon: <IconX size={16} />,
  },
  warning: {
    bg:   'bg-amber-500',
    text: 'text-white',
    icon: <IconAlertTriangle size={16} />,
  },
  info: {
    bg:   'bg-[#E85D04]',
    text: 'text-white',
    icon: <IconInfoCircle size={16} />,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast,
    success: (m) => toast('success', m),
    error:   (m) => toast('error', m),
    warning: (m) => toast('warning', m),
    info:    (m) => toast('info', m),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast portal — bottom center */}
      <div
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none"
        style={{ minWidth: 280, maxWidth: 'calc(100vw - 32px)' }}
      >
        {toasts.map((t) => {
          const s = TYPE_STYLES[t.type];
          return (
            <div
              key={t.id}
              className={[
                'flex items-center gap-2.5 px-4 py-3 rounded-brands shadow-brand2 pointer-events-auto',
                'animate-[slideUp_0.25s_ease]',
                s.bg, s.text,
              ].join(' ')}
            >
              <span className="flex-shrink-0">{s.icon}</span>
              <span className="text-[13px] font-semibold">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <IconX size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
