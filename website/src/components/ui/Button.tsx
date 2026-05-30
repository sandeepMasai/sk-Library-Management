import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'ghost-dark';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/30 hover:brightness-110 hover:shadow-primary/40',
  secondary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  'ghost-dark': 'bg-transparent text-white/90 hover:bg-white/10',
  outline:
    'border-2 border-primary/30 bg-white/80 text-primary backdrop-blur-sm hover:border-primary hover:bg-primary/5',
};

const sizes: Record<Size, string> = {
  sm: 'rounded-lg px-3 py-2 text-xs',
  md: 'rounded-xl px-5 py-3 text-sm',
  lg: 'rounded-xl px-6 py-3.5 text-base',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
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
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98] focus-ring-brand disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
