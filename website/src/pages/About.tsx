import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { SITE } from '../content/site';

const VALUES = [
  { title: 'Reliability', desc: 'Built for daily attendance and billing — not demo-day features.' },
  { title: 'Privacy', desc: 'Each library is isolated. Your student data stays yours.' },
  { title: 'Simplicity', desc: 'Owners and students get focused mobile apps that just work.' },
];

export function About() {
  return (
    <>
      <PageHero
        title="About SmartLibDesk"
        subtitle="We help Indian study libraries digitize operations without enterprise complexity."
        badge="Our story"
      />
      <section className="bg-white py-16">
        <PageContainer>
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="space-y-6 leading-relaxed text-muted">
              <p>
                {SITE.name} was created for reading rooms, coaching libraries, and study halls that still rely on
                registers, WhatsApp groups, and manual fee tracking.
              </p>
              <p>
                Our platform gives library owners a single dashboard for students, QR attendance, seat maps, renewal
                requests, message templates, and Razorpay-powered subscriptions.
              </p>
              <p>
                Students use a lightweight app to check in, view notifications, and manage their membership — while you
                stay in control of plans and access.
              </p>
              <Link to="/register">
                <Button>Register your library</Button>
              </Link>
            </div>
            <div className="grid gap-4">
              {VALUES.map((v) => (
                <GlassCard key={v.title} hover padding="md">
                  <h3 className="font-semibold text-slate-900">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted">{v.desc}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </PageContainer>
      </section>
    </>
  );
}
