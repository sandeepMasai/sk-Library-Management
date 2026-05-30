import type { ReactNode } from 'react';

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  dark?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

const paddingMap = {
  none: '',
  sm: 'p-4 sm:p-5',
  md: 'p-6 sm:p-7',
  lg: 'p-8 sm:p-10',
};

export function GlassCard({
  children,
  className = '',
  hover = false,
  dark = false,
  padding = 'md',
}: GlassCardProps) {
  const base = dark ? 'glass-panel-dark rounded-2xl' : 'glass-panel rounded-2xl';
  const hoverClass = hover ? (dark ? 'hover-lift-dark' : 'hover-lift') : '';

  return (
    <div className={`${base} ${paddingMap[padding]} ${hoverClass} ${className}`}>{children}</div>
  );
}
