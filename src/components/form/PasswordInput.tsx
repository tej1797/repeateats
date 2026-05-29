'use client';

import { useState } from 'react';
import Input from '@/components/ui/Input';
import type { InputHTMLAttributes } from 'react';

interface Requirement {
  label: string;
  test:  (v: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  { label: '8+ characters',       test: (v) => v.length >= 8 },
  { label: 'Uppercase letter',    test: (v) => /[A-Z]/.test(v) },
  { label: 'Number',              test: (v) => /\d/.test(v) },
  { label: 'Special character',   test: (v) => /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(v) },
];

function strength(v: string): number {
  return REQUIREMENTS.filter((r) => r.test(v)).length;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['', '#EF4444', '#F59E0B', '#EAB308', '#22C55E'];

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?:          string;
  error?:          string;
  showStrength?:   boolean;
}

export default function PasswordInput({
  label = 'Password',
  error,
  showStrength = false,
  value,
  ...rest
}: PasswordInputProps) {
  const [touched, setTouched] = useState(false);
  const val = (typeof value === 'string' ? value : '') as string;
  const level = strength(val);

  return (
    <div className="space-y-2">
      <Input
        label={label}
        type="password"
        value={value}
        error={error}
        onFocus={() => setTouched(true)}
        {...rest}
      />

      {showStrength && touched && val.length > 0 && (
        <>
          {/* Strength bar */}
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-full transition-all duration-300"
                style={{ background: i <= level ? STRENGTH_COLORS[level] : 'var(--sf2)' }}
              />
            ))}
          </div>
          <p className="text-[12px] font-semibold" style={{ color: STRENGTH_COLORS[level] }}>
            {STRENGTH_LABELS[level]}
          </p>

          {/* Requirement checklist */}
          <ul className="space-y-0.5">
            {REQUIREMENTS.map((req) => {
              const met = req.test(val);
              return (
                <li
                  key={req.label}
                  className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: met ? '#22C55E' : 'var(--t3)' }}
                >
                  <span>{met ? '✓' : '○'}</span>
                  {req.label}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
