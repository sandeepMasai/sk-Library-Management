import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { PLANS } from '../content/site';

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(
    amount
  );
}

export function Pricing() {
  return (
    <>
      <PageHero
        title="Simple, transparent pricing"
        subtitle="Library subscriptions billed via Razorpay in the app. No hidden fees."
      />
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`card-hover relative flex flex-col rounded-3xl border bg-white p-8 shadow-sm ${
                plan.tag === 'Popular' ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'
              }`}
            >
              {plan.tag ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-white">
                  {plan.tag}
                </span>
              ) : null}
              <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
              <p className="mt-3 text-4xl font-extrabold text-primary">{formatInr(plan.price)}</p>
              <p className="text-sm text-muted">per {plan.duration}</p>
              <ul className="mt-8 flex-1 space-y-3 border-t border-slate-100 pt-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-slate-600">
                    <span className="text-primary">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="mt-8 block">
                <Button variant={plan.tag === 'Popular' ? 'primary' : 'outline'} fullWidth>
                  Get started
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-muted">
          Payments are processed securely by Razorpay. After registering, open the SmartLibDesk app to subscribe.{' '}
          <Link to="/contact" className="font-semibold text-primary hover:underline">
            Questions? Contact us
          </Link>
        </p>
      </section>
    </>
  );
}
