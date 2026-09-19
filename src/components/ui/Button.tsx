'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'subtle' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 disabled:bg-brand-200',
  outline:
    'border border-line bg-white text-ink-800 hover:bg-slate-50 disabled:opacity-40',
  ghost: 'text-ink-600 hover:bg-slate-100 disabled:opacity-40',
  subtle:
    'border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 disabled:opacity-40',
  danger:
    'border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-40',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = 'outline', icon, className = '', children, ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type="button"
        className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer
          transition disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
        {...rest}
      >
        {icon}
        {children}
      </button>
    );
  },
);
