import type { ReactNode } from 'react';
import { PageHero } from './PageHero';
import { GlassCard } from './ui/GlassCard';
import { PageContainer } from './ui/PageContainer';

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <>
      <PageHero title={title} badge="Legal" />
      <section className="bg-white py-12">
        <PageContainer size="md">
          <GlassCard
            padding="lg"
            className="prose prose-slate max-w-none [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          >
            <article className="space-y-4 leading-relaxed text-slate-700">{children}</article>
          </GlassCard>
        </PageContainer>
      </section>
    </>
  );
}
