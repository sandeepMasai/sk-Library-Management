import type { ReactNode } from 'react';
import { Badge } from './ui/Badge';

type PageHeroProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
};

export function PageHero({ title, subtitle, badge, children }: PageHeroProps) {
  return (
    <section className="gradient-mesh relative overflow-hidden border-b border-white/10">
      <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-accent/15 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
        {badge ? (
          <Badge variant="dark" className="mb-4">
            {badge}
          </Badge>
        ) : null}
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-base text-white/75 sm:mt-4 sm:text-lg">{subtitle}</p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
