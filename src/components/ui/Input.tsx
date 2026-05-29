'use client';

import { useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { IconEye, IconEyeOff, IconCheck } from '@tabler/icons-react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?:       string;
  error?:       string;
  success?:     string;
  icon?:        ReactNode;
  floatingLabel?: boolean;
}

export default function Input({
  label,
  error,
  success,
  icon,
  type = 'text',
  floatingLabel = false,
  className = '',
  placeholder,
  value,
  ...rest
}: InputProps) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = type === 'password';
  const inputType  = isPassword ? (show ? 'text' : 'password') : type;
  const isFilled   = Boolean(value) || Boolean(rest.defaultValue);

  const borderColor = error
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
    : success
    ? 'border-green-400 focus:border-green-500 focus:ring-green-500/20'
    : 'border-[var(--bd2)] focus:border-[#E85D04] focus:ring-[#E85D04]/15';

  if (floatingLabel && label) {
    const raised = focused || isFilled;
    return (
      <div className="relative">
        <div className={`relative flex items-center rounded-brands border bg-surface transition-all ${borderColor} focus-within:ring-2`}>
          {icon && (
            <span className="absolute left-3 text-t3 flex-shrink-0">{icon}</span>
          )}
          <input
            {...rest}
            type={inputType}
            value={value}
            placeholder=""
            onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
            onBlur={(e)  => { setFocused(false); rest.onBlur?.(e); }}
            className={[
              'w-full bg-transparent px-3 pt-5 pb-1.5 text-[14px] text-tx outline-none rounded-brands',
              icon ? 'pl-9' : '',
              isPassword ? 'pr-10' : '',
            ].join(' ')}
          />
          <label
            className={`absolute left-3 pointer-events-none transition-all duration-150 font-medium ${icon ? 'left-9' : ''} ${
              raised
                ? 'text-[10px] top-1.5 text-[#E85D04]'
                : 'text-[14px] top-1/2 -translate-y-1/2 text-t3'
            }`}
          >
            {label}
          </label>
          {isPassword && (
            <button
              type="button"
              className="absolute right-3 text-t3 hover:text-t2 transition-colors"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            </button>
          )}
          {success && !isPassword && (
            <IconCheck size={16} className="absolute right-3 text-green-500" />
          )}
        </div>
        {error   && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
        {success && <p className="mt-1 text-[12px] text-green-600">{success}</p>}
      </div>
    );
  }

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-semibold text-t2 mb-1.5">{label}</label>
      )}
      <div className={`relative flex items-center rounded-brands border bg-surface transition-all ${borderColor} focus-within:ring-2`}>
        {icon && (
          <span className="absolute left-3 text-t3 flex-shrink-0">{icon}</span>
        )}
        <input
          {...rest}
          type={inputType}
          value={value}
          placeholder={placeholder}
          className={[
            'w-full bg-transparent py-2.5 px-3 text-[14px] text-tx outline-none rounded-brands',
            icon ? 'pl-9' : '',
            isPassword || success ? 'pr-10' : '',
            className,
          ].join(' ')}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-3 text-t3 hover:text-t2 transition-colors"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <IconEyeOff size={16} /> : <IconEye size={16} />}
          </button>
        )}
        {success && !isPassword && (
          <IconCheck size={16} className="absolute right-3 text-green-500" />
        )}
      </div>
      {error   && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
      {success && <p className="mt-1 text-[12px] text-green-600">{success}</p>}
    </div>
  );
}
