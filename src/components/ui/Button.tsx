'use client';

import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'caution';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-scout-purple hover:bg-scout-purple-light focus-visible:outline-scout-purple-light',
  secondary: 'bg-scout-field hover:bg-scout-field-border focus-visible:outline-scout-teal-light',
  success: 'bg-emerald-600 hover:bg-emerald-700 focus-visible:outline-emerald-400',
  danger: 'bg-red-600 hover:bg-red-700 focus-visible:outline-red-400',
  warning: 'bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-400',
  caution: 'bg-orange-600 hover:bg-orange-700 focus-visible:outline-orange-400',
};

export default function Button({ variant = 'primary', loading, disabled, className = '', children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        <svg className="h-4 w-4 flex-none animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
