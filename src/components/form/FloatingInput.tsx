'use client';

import Input from '@/components/ui/Input';
import type { InputHTMLAttributes } from 'react';

// Thin wrapper that defaults floatingLabel=true
interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label:     string;
  error?:    string;
  success?:  string;
  icon?:     React.ReactNode;
}

export default function FloatingInput({ label, ...rest }: FloatingInputProps) {
  return <Input label={label} floatingLabel {...rest} />;
}
