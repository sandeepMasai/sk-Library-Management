import type { ReactNode } from 'react';
import { SectionHeader } from './SectionHeader';

type SectionProps = {
  children: ReactNode;
  emoji?: string;
  title: string;
  subtitle?: string;
  variant?: 'default' | 'muted' | 'dark' | 'gradient';
  className?: string;
  id?: string;
};

const variants = {
  default: 'bg-white py-14 sm:py-20',
  muted: 'gradient-mesh-light border-y border-slate-200/60 py-14 sm:py-20',
  dark: 'gradient-mesh py-14 text-white sm:py-20',
  gradient: 'bg-gradient-to-br from-primary via-primary to-accent py-16 text-white sm:py-20',
};

export function Section({
  children,
  emoji,
  title,
  subtitle,
  variant = 'default',
  className = '',
  id,
}: SectionProps) {
  const isDark = variant === 'dark' || variant === 'gradient';

  return (
    <section id={id} className={`${variants[variant]} ${className}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeader emoji={emoji} title={title} subtitle={subtitle} dark={isDark} />
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
