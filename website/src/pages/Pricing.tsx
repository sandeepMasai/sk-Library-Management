import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PricingPlanGrid } from '../components/pricing/PricingPlanGrid';
import { PageHero } from '../components/PageHero';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { PLANS } from '../content/site';
import { fetchPublicPlans, type PublicPlan } from '../lib/plansApi';

/** Fallback when API is unreachable (offline dev). */
function staticPlansToPublic(): PublicPlan[] {
  return PLANS.map((p) => ({
    key: p.key,
    name: p.name,
    price: p.price,
    finalPrice: p.price,
    duration:
      p.key === 'yearly' ? 365 : p.key === '6month' ? 180 : p.key === 'monthly' ? 30 : 10,
    tag: p.tag,
    isTrial: p.key === 'trial',
    features: [...p.features],
  }));
}

export function Pricing() {
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchPublicPlans();
        if (cancelled) return;
        if (res.plans.length) {
          setPlans(res.plans);
          setUpdatedAt(res.updatedAt || null);
        } else {
          setPlans(staticPlansToPublic());
          setError('Showing default plans — live plans will appear when the backend is connected.');
        }
      } catch (e) {
        if (cancelled) return;
        setPlans(staticPlansToPublic());
        setError(e instanceof Error ? e.message : 'Could not load live plans');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHero
        title="Simple, transparent pricing"
        subtitle="Plans sync from Super Admin — price, duration, discounts, and offers update in real time."
        badge="💰 Pricing"
      />
      <section className="gradient-mesh border-b border-white/10 py-12 sm:py-16">
        <PageContainer>
          <PricingPlanGrid plans={plans} updatedAt={updatedAt} loading={loading} error={error} />
          <GlassCard dark padding="md" className="mt-12 text-center">
            <p className="text-sm text-white/70">
              Payments are processed securely by Razorpay. After registering, open SmartLibDesk to subscribe.{' '}
              <Link to="/contact" className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                Questions? Contact us
              </Link>
            </p>
          </GlassCard>
        </PageContainer>
      </section>
    </>
  );
}
