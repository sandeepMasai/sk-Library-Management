import type { ReactNode } from 'react';
import { PageHero } from './PageHero';

type LegalLayoutProps = {
  title: string;
  children: ReactNode;
};

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <>
      <PageHero title={title} />
      <article className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-slate-700 leading-relaxed sm:px-6 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_a]:text-primary [&_a]:underline">
        {children}
      </article>
    </>
  );
}
