import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button } from '../components/ui/Button';
import { FAQ, HOW_IT_WORKS, SERVICES, SITE, STATS, TESTIMONIALS } from '../content/site';

export function Home() {
  return (
    <>
      <section className="mesh-bg relative overflow-hidden border-b border-slate-200/80">
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary shadow-sm">
                Library SaaS · India
              </span>
              <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Run your study library like a{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  modern business
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                {SITE.name} brings attendance, seats, students, notifications, and Razorpay subscriptions into one
                platform — built for reading rooms and coaching libraries.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/register">
                  <Button>Start free registration</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline">Sign in</Button>
                </Link>
              </div>
            </div>
            <div className="relative hidden flex-col items-center lg:flex">
              <Logo size="lg" linkToHome={false} showName className="mb-8" />
              <div className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl shadow-primary/10">
                <div className="grid grid-cols-2 gap-4">
                  {STATS.map((s) => (
                    <div key={s.label} className="rounded-2xl bg-slate-50 p-5 text-center">
                      <p className="text-2xl font-bold text-primary">{s.value}</p>
                      <p className="mt-1 text-xs font-medium text-muted">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-center text-sm text-muted">Trusted by library owners across India</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white py-12">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center lg:hidden">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-slate-900">Everything your library needs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted">From daily check-in to subscription billing — no spreadsheets required.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <article
              key={s.title}
              className="card-hover rounded-2xl border border-slate-200 bg-white p-7 shadow-sm"
            >
              <span className="text-3xl">{s.icon}</span>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.description}</p>
            </article>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link to="/services" className="text-sm font-semibold text-primary hover:underline">
            Explore all services →
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
          <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step} className="relative rounded-2xl bg-white p-6 shadow-sm">
                <span className="text-4xl font-black text-primary/15">{step.step}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-muted">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">What owners say</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.author} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-lg leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-6">
                <p className="font-semibold text-slate-900">{t.author}</p>
                <p className="text-sm text-muted">{t.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-br from-primary via-primary to-accent px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <h2 className="text-3xl font-bold">Ready to go digital?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Register your library in minutes. Subscribe with Razorpay when you are ready — Trial from ₹99.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button className="!bg-white !text-primary hover:!brightness-95">Create library account</Button>
            </Link>
            <Link to="/pricing">
              <Button variant="outline" className="!border-white/40 !text-white hover:!bg-white/10">
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">Frequently asked questions</h2>
        <dl className="mt-10 space-y-6">
          {FAQ.map((item) => (
            <div key={item.q} className="rounded-2xl border border-slate-200 bg-white p-6">
              <dt className="font-semibold text-slate-900">{item.q}</dt>
              <dd className="mt-2 text-sm text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
