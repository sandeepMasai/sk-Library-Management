import type { ReactNode } from 'react';

type SaasCardProps = {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md';
  brand?: boolean;
  error?: boolean;
};

const pad = { none: '', sm: 'p-4', md: 'p-5 sm:p-6' };

export function SaasCard({ children, className = '', padding = 'md', brand = false, error = false }: SaasCardProps) {
  const base =
    'rounded-2xl border text-white shadow-sm backdrop-blur-sm [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_dt]:text-white/70 [&_dd]:text-white';

  const tone = error
    ? 'border-red-400/30 bg-red-500/15'
    : brand
      ? 'border-white/20 bg-white/12 shadow-white/5'
      : 'border-white/15 bg-white/10';

  return (
    <div className={`${base} ${tone} ${pad[padding]} ${className}`}>
      {children}
    </div>
  );
}
