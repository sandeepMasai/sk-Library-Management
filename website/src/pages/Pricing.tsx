import { Link } from 'react-router-dom';
import { PageHero } from '../components/PageHero';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
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
        badge="💰 Pricing"
      />
      <section className="bg-white py-12 sm:py-16">
        <PageContainer>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isPopular = plan.tag === 'Popular';
              return (
                <GlassCard
                  key={plan.key}
                  hover
                  padding="lg"
                  className={`relative flex flex-col ${
                    isPopular ? 'ring-2 ring-primary/40 shadow-lg shadow-primary/15' : ''
                  }`}
                >
                  {plan.tag ? (
                    <span
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white ${
                        isPopular ? 'bg-gradient-to-r from-primary to-accent shadow-lg' : 'bg-primary'
                      }`}
                    >
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
                    <Button variant={isPopular ? 'primary' : 'outline'} fullWidth>
                      Get started
                    </Button>
                  </Link>
                </GlassCard>
              );
            })}
          </div>
          <GlassCard padding="md" className="mt-12 text-center">
            <p className="text-sm text-muted">
              Payments are processed securely by Razorpay. After registering, open the SmartLibDesk app to subscribe.{' '}
              <Link to="/contact" className="font-semibold text-primary hover:underline">
                Questions? Contact us
              </Link>
            </p>
          </GlassCard>
        </PageContainer>
      </section>
    </>
  );
}
