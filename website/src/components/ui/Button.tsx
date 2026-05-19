import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25 hover:brightness-110',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  outline: 'border-2 border-primary/30 bg-white text-primary hover:border-primary hover:bg-primary/5',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  fullWidth,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
