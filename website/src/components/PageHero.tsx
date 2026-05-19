type PageHeroProps = {
  title: string;
  subtitle?: string;
};

export function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-primary/10 via-surface to-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-base text-muted sm:mt-3 sm:text-lg">{subtitle}</p> : null}
      </div>
    </section>
  );
}
