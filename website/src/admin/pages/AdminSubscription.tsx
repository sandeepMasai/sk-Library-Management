import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { ensureSession } from '../../lib/http';
import { openRazorpayCheckout } from '../../lib/razorpayWeb';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { fetchPlans, fetchSubscriptionMe, type PlanRow, type SubscriptionMe } from '../api/libraryApi';

const FEATURES = [
  'Student management',
  'Attendance QR scanning',
  'Seat layout & assignments',
  'Fee & membership tracking',
  'WhatsApp & notifications',
];

function durationLabel(days: number, isTrial?: boolean) {
  if (isTrial) return 'Trial plan';
  if (days >= 365) return 'Per year';
  if (days >= 30) return 'Per month';
  return `${days} days`;
}

function planCta(plan: PlanRow, paying: boolean) {
  if (paying) return 'Processing…';
  if (plan.isTrial) return 'Activate';
  return 'Upgrade';
}

export function AdminSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<SubscriptionMe | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanRow | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await ensureSession();
      if (!alive) return;
      if (!ok) {
        setError('Session expired. Please sign in again.');
        return;
      }
      try {
        const [p, s] = await Promise.all([fetchPlans(), fetchSubscriptionMe()]);
        if (!alive) return;
        setPlans(p);
        setSub(s);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : 'Failed to load';
        if (!/session expired|sign in/i.test(msg)) setError(msg);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activePlanKey = String(sub?.currentPlanKey || sub?.plan || '').toLowerCase();

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => a.finalPrice - b.finalPrice);
  }, [plans]);

  async function pay(plan: PlanRow) {
    const planId = plan._id || plan.id;
    if (!planId) return;
    const ok = await ensureSession();
    if (!ok) {
      setError('Session expired. Please sign in again before paying.');
      return;
    }
    setPaying(planId);
    setError('');
    try {
      await openRazorpayCheckout(planId, { name: user?.name, email: user?.email });
      const fresh = await fetchSubscriptionMe();
      setSub(fresh);
      setCheckoutPlan(null);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  }

  const finalAmount = checkoutPlan ? checkoutPlan.finalPrice : 0;

  return (
    <div className="admin-dashboard-pad page-pad">
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-6 shadow-lg shadow-primary/5 sm:p-10">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">SmartLibDesk</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Upgrade your library
          </h1>
          <p className="mt-3 text-base text-muted sm:text-lg">
            Manage students, attendance, payments and communication — all in one premium workspace.
          </p>
        </div>
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-48 w-48 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
      </section>

      {sub ? (
        <GlassCard admin padding="md" className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Current plan</p>
              <p className="mt-1 text-lg font-semibold capitalize text-slate-900">
                {sub.plan || sub.currentPlanKey || 'none'} · {sub.subscriptionStatus || 'inactive'}
              </p>
              {sub.planExpiryDate ? (
                <p className="mt-1 text-sm text-muted">
                  Expires {new Date(sub.planExpiryDate).toLocaleDateString('en-IN')}
                </p>
              ) : null}
            </div>
            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                🎉 Subscription activated
              </div>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      {error ? (
        <GlassCard admin padding="md" className="mt-4 border-red-300/40">
          <div className="text-sm text-red-800">
            <p>{error}</p>
            {/sign in|session expired/i.test(error) ? (
              <Link to="/login" className="mt-2 inline-block font-semibold text-primary underline">
                Go to login
              </Link>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sortedPlans.map((plan) => {
          const planId = plan._id || plan.id || '';
          const isCurrent = activePlanKey && plan.key.toLowerCase() === activePlanKey;
          const isPopular = plan.badges?.recommended || plan.tag?.toLowerCase().includes('popular');
          const isBestValue = plan.badges?.bestValue || plan.tag?.toLowerCase().includes('best');
          const isExclusive = plan.badges?.exclusive || plan.planType === 'library_specific';

          return (
            <GlassCard admin
              key={planId}
              hover
              padding="md"
              className={`relative flex flex-col ${
                isPopular ? 'ring-2 ring-primary/30' : isExclusive ? 'ring-2 ring-amber-300/50' : ''
              }`}
            >
              {isPopular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Most popular
                </span>
              ) : null}
              {isBestValue && !isPopular ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Best value
                </span>
              ) : null}
              {isExclusive ? (
                <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  🎁 Exclusive offer
                </span>
              ) : null}

              <h2 className="font-display text-xl font-bold text-slate-900">{plan.name}</h2>
              <div className="mt-3 flex items-end gap-2">
                {plan.strikePrice && plan.strikePrice > plan.finalPrice ? (
                  <span className="text-lg text-muted line-through">₹{plan.strikePrice}</span>
                ) : null}
                <span className="text-3xl font-bold text-primary">₹{plan.finalPrice}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{durationLabel(plan.duration, plan.isTrial)}</p>
              {plan.description ? <p className="mt-2 text-sm text-muted">{plan.description}</p> : null}

              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-600">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-6 w-full"
                variant={isPopular ? 'default' : 'outline'}
                disabled={paying !== null || isCurrent}
                onClick={() => setCheckoutPlan(plan)}
              >
                {isCurrent ? 'Current plan' : planCta(plan, paying === planId)}
              </Button>
            </GlassCard>
          );
        })}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted">
        <span>🔒</span> Secure Razorpay payment · PCI DSS compliant checkout
      </p>

      {checkoutPlan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <GlassCard admin padding="md" className="w-full max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Payment summary</p>
                <h3 className="font-display text-xl font-bold text-slate-900">{checkoutPlan.name}</h3>
              </div>
              <button type="button" className="text-muted" onClick={() => setCheckoutPlan(null)}>
                ✕
              </button>
            </div>

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Plan</dt>
                <dd className="font-medium text-slate-900">{checkoutPlan.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Duration</dt>
                <dd className="font-medium text-slate-900">{checkoutPlan.duration} days</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Price</dt>
                <dd className="font-medium text-slate-900">₹{checkoutPlan.finalPrice}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
                <dt className="font-semibold text-slate-900">Total</dt>
                <dd className="font-bold text-primary">₹{finalAmount}</dd>
              </div>
            </dl>

            <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center text-xs text-muted">
              🔒 Secure Razorpay payment
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="flex-1"
                disabled={paying !== null}
                onClick={() => pay(checkoutPlan)}
              >
                {paying ? 'Opening checkout…' : 'Pay with Razorpay'}
              </Button>
              <Button variant="ghost" onClick={() => setCheckoutPlan(null)}>
                Cancel
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {success && sub?.planExpiryDate ? (
        <GlassCard admin padding="md" className="mt-6 border-emerald-300/40">
          <h3 className="font-semibold text-emerald-900">Plan details</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Expiry date</dt>
              <dd className="font-medium text-slate-900">
                {new Date(sub.planExpiryDate).toLocaleDateString('en-IN')}
              </dd>
            </div>
            {sub.planStartDate ? (
              <div>
                <dt className="text-muted">Started</dt>
                <dd className="font-medium text-slate-900">
                  {new Date(sub.planStartDate).toLocaleDateString('en-IN')}
                </dd>
              </div>
            ) : null}
          </dl>
        </GlassCard>
      ) : null}
    </div>
  );
}
