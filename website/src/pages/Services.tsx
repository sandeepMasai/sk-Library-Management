import { Link } from 'react-router-dom';
import { LibraryWorkflow } from '../components/LibraryWorkflow';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { SERVICES } from '../content/site';

export function Services() {
  return (
    <>
      <PageHero
        title="Services"
        subtitle="Everything a modern study library needs — from first student to monthly billing."
        badge="⚡ Services"
      />
      <section className="gradient-mesh border-b border-white/10 py-16">
        <LibraryWorkflow className="py-0" dark />
      </section>
      <section className="gradient-mesh border-b border-white/10 py-16">
        <PageContainer>
          <div className="grid gap-8 md:grid-cols-2">
            {SERVICES.map((s, i) => (
              <GlassCard key={s.title} dark hover padding="lg" className="flex gap-5">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl">
                  {s.icon}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-300">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-white">{s.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-white/70">{s.description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
          <div className="mt-16 overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-accent p-10 text-center text-white shadow-xl shadow-primary/20">
            <h3 className="font-display text-2xl font-bold">Start with your library account</h3>
            <p className="mx-auto mt-2 max-w-lg text-white/85">Register, verify email, and invite students from the app.</p>
            <Link to="/register" className="mt-6 inline-block">
              <Button className="!bg-white ">Register now</Button>
            </Link>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
