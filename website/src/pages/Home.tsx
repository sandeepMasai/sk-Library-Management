import { Link } from 'react-router-dom';
import { AnimateIn } from '../components/ui/AnimateIn';
import { LibraryWorkflow } from '../components/LibraryWorkflow';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { FeaturePill } from '../components/ui/FeaturePill';
import { GlassCard } from '../components/ui/GlassCard';
import { MarqueeTicker } from '../components/ui/MarqueeTicker';
import { Section } from '../components/ui/Section';
import { StatCard } from '../components/ui/StatCard';
import {
  FAQ,
  FEATURE_PILLS,
  HOW_IT_WORKS,
  SERVICES,
  SITE,
  STATS,
  TESTIMONIALS,
} from '../content/site';

export function Home() {
  return (
    <>
      <section className="gradient-mesh relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -right-32 top-20 h-96 w-96 rounded-full bg-primary/25 blur-3xl animate-blob" />
        <div className="pointer-events-none absolute -left-20 bottom-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl animate-blob-slow" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-teal-400/10 blur-3xl animate-blob-delayed" />
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24 lg:py-32">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div>
              <AnimateIn immediate delay={0}>
                <Badge variant="dark">Library SaaS · India</Badge>
              </AnimateIn>
              <AnimateIn immediate delay={80}>
                <h1 className="font-display mt-5 text-3xl font-extrabold leading-[1.12] tracking-tight text-white sm:mt-6 sm:text-4xl md:text-5xl lg:text-6xl">
                Run your study library like a{' '}
                <span className="text-gradient-brand">modern business</span>
              </h1>
              </AnimateIn>
              <AnimateIn immediate delay={160}>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:mt-6 sm:text-lg">
                {SITE.name} brings attendance, seats, students, notifications, and Razorpay subscriptions into one
                platform — built for reading rooms and coaching libraries.
              </p>
              </AnimateIn>
              <AnimateIn immediate delay={240}>
              <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button fullWidth className="sm:!w-auto">
                    Start free registration
                  </Button>
                </Link>
                <Link to="/pricing" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    fullWidth
                    className="!border-white/30 !bg-white/5 !text-white hover:!bg-white/15 sm:!w-auto"
                  >
                    View pricing
                  </Button>
                </Link>
                <Link to="/download" className="w-full sm:w-auto">
                  <Button variant="ghost-dark" fullWidth className="sm:!w-auto">
                    Download app
                  </Button>
                </Link>
              </div>
              </AnimateIn>
            </div>
            <AnimateIn immediate delay={320} className="relative hidden lg:block">
              <GlassCard dark hover padding="lg" className="!rounded-3xl animate-pulse-glow">
                <div className="grid grid-cols-2 gap-4">
                  {STATS.map((s) => (
                    <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
                      <p className="text-2xl font-bold text-teal-300">{s.value}</p>
                      <p className="mt-1 text-xs font-medium text-white/60">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-center text-sm text-white/50">Trusted by library owners across India</p>
              </GlassCard>
            </AnimateIn>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:mt-16">
            {STATS.map((s, i) => (
              <AnimateIn key={s.label} delay={i * 80}>
                <StatCard label={s.label} value={s.value} tone="dark" className="!p-4 sm:!p-5" />
              </AnimateIn>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {FEATURE_PILLS.map((pill, i) => (
              <AnimateIn key={pill.label} delay={i * 70}>
                <FeaturePill label={pill.label} sublabel={pill.sublabel} />
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <MarqueeTicker />

      <Section emoji="⚡ Services" title="Everything your library needs" subtitle="From daily check-in to subscription billing — no spreadsheets required." variant="dark">
        <div className="mt-0 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <AnimateIn key={s.title} delay={i * 60}>
            <GlassCard dark hover padding="lg" className="relative h-full">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
                {String(i + 1).padStart(2, '0')} — {s.title.split(' ')[0]}
              </span>
              <span className="mt-4 block text-3xl">{s.icon}</span>
              <h3 className="mt-3 text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{s.description}</p>
              <Link to="/services" className="mt-4 inline-block text-sm font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                Learn more →
              </Link>
            </GlassCard>
            </AnimateIn>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/services" className="text-sm font-semibold text-teal-300 hover:text-teal-200 hover:underline">
            Explore all services →
          </Link>
        </div>
      </Section>

      <section className="gradient-mesh border-y border-white/10 py-14 sm:py-20">
        <LibraryWorkflow dark />
      </section>

      <Section emoji="⚡ How it works" title="From registration to daily ops" subtitle="Four steps to run your library on SmartLibDesk." variant="dark">
        <div className="mt-0 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <AnimateIn key={step.step} delay={i * 80}>
            <GlassCard dark hover padding="md" className="relative h-full">
              <span className="font-display text-4xl font-black text-white/10">{step.step}</span>
              <h3 className="mt-2 font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/70">{step.desc}</p>
            </GlassCard>
            </AnimateIn>
          ))}
        </div>
      </Section>

      <Section emoji="⭐ Reviews" title="What owners say" variant="dark">
        <div className="mt-0 grid gap-6 md:grid-cols-2">
          {TESTIMONIALS.map((t, i) => (
            <AnimateIn key={t.author} delay={i * 100}>
            <GlassCard dark hover padding="lg" className="h-full">
              <p className="text-amber-400">★★★★★</p>
              <p className="mt-4 text-lg leading-relaxed text-white/85">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-6 border-t border-white/10 pt-4">
                <p className="font-semibold text-white">{t.author}</p>
                <p className="text-sm text-white/60">{t.role}</p>
              </footer>
            </GlassCard>
            </AnimateIn>
          ))}
        </div>
      </Section>

      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-accent px-4 py-20 text-white sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.04\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative mx-auto max-w-6xl text-center">
          <h2 className="font-display text-2xl font-bold sm:text-3xl md:text-4xl">Ready to go digital?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Register your library in minutes. Subscribe with Razorpay when you are ready — Trial from ₹99.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 px-2 sm:mt-10 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4 sm:px-0">
            <Link to="/register" className="w-full sm:w-auto">
              <Button fullWidth className="!bg-white !text-primary hover:!brightness-95 sm:!w-auto">
                Create library account
              </Button>
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto">
              <Button
                variant="outline"
                fullWidth
                className="!border-white/40 !text-white hover:!bg-white/10 sm:!w-auto"
              >
                View pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Section emoji="❓ FAQ" title="Frequently asked questions" variant="dark">
        <dl className="mt-0 space-y-4">
          {FAQ.map((item, i) => (
            <AnimateIn key={item.q} delay={i * 60}>
            <GlassCard dark padding="md">
              <dt className="font-semibold text-white">{item.q}</dt>
              <dd className="mt-2 text-sm text-white/70">{item.a}</dd>
            </GlassCard>
            </AnimateIn>
          ))}
        </dl>
      </Section>
    </>
  );
}
