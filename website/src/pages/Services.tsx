import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { SERVICES } from '../content/site';

export function Services() {
  return (
    <>
      <PageHero
        title="Services"
        subtitle="Everything a modern study library needs — from first student to monthly billing."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              className="card-hover flex gap-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl">
                {s.icon}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{s.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-16 rounded-3xl bg-gradient-to-r from-primary to-accent p-10 text-center text-white">
          <h3 className="text-2xl font-bold">Start with your library account</h3>
          <p className="mx-auto mt-2 max-w-lg text-white/85">Register, verify email, and invite students from the app.</p>
          <Link to="/register" className="mt-6 inline-block">
            <Button className="!bg-white !text-primary">Register now</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
