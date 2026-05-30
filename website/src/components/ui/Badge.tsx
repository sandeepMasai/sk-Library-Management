import type { ReactNode } from 'react';

type BadgeProps = {
  children: ReactNode;
  variant?: 'default' | 'dark' | 'primary';
  className?: string;
};

const variants = {
  default: 'border-primary/20 bg-white/90 text-primary shadow-sm',
  dark: 'border-white/15 bg-white/10 text-teal-200',
  primary: 'border-transparent bg-primary text-white shadow-lg shadow-primary/30',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider sm:px-4 sm:text-xs ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
