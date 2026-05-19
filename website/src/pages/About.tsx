import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
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
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2">
          <div className="space-y-6 text-muted leading-relaxed">
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
              <div key={v.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900">{v.title}</h3>
                <p className="mt-2 text-sm text-muted">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
