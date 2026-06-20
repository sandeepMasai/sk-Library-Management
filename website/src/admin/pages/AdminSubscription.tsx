import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { ensureSession } from '../../lib/http';
import { openRazorpayCheckout, preloadRazorpayCheckout } from '../../lib/razorpayWeb';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { fetchPlans, fetchSubscriptionMe, type PlanRow, type SubscriptionMe } from '../api/libraryApi';
import { planDurationLabel } from '../utils/billingHelpers';

const FEATURES = [
  'Student management',
  'Attendance QR scanning',
  'Seat layout & assignments',
  'Fee & membership tracking',
  'WhatsApp & notifications',
];

function planPeriodLabel(plan: PlanRow) {
  return planDurationLabel(plan.key, plan);
}

function planBadge(plan: PlanRow) {
  if (plan.badges?.recommended || plan.tag?.toLowerCase().includes('popular')) return 'Most popular';
  if (plan.badges?.bestValue || plan.tag?.toLowerCase().includes('best')) return 'Best value';
  if (plan.badges?.exclusive || plan.planType === 'library_specific') return 'Exclusive offer';
  if (plan.isTrial || plan.key.toLowerCase().includes('trial')) return 'Trial';
  if (plan.key.toLowerCase().includes('year') || plan.duration >= 365) return 'Yearly';
  if (plan.key.toLowerCase().includes('6') || plan.duration >= 180) return '6 Months';
  if (plan.key.toLowerCase().includes('month') || plan.duration >= 30) return 'Monthly';
  return null;
}

function planCta(paying: boolean) {
  if (paying) return 'Processing…';
  return 'Select plan';
}

export function AdminSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<SubscriptionMe | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanRow | null>(null);
  const [payError, setPayError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    preloadRazorpayCheckout();
  }, []);

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
    setPayError('');
    try {
      await openRazorpayCheckout(planId, { name: user?.name, email: user?.email });
      const fresh = await fetchSubscriptionMe();
      setSub(fresh);
      setCheckoutPlan(null);
      setPayError('');
      setSuccess(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      setPayError(msg);
      setError(msg);
    } finally {
      setPaying(null);
    }
  }

  function closeCheckout() {
    setCheckoutPlan(null);
    setPayError('');
  }

  const finalAmount = checkoutPlan ? checkoutPlan.finalPrice : 0;

  return (
    <div className="admin-dashboard-pad page-pad">
      <AdminPageHeader
        title="Upgrade your library"
        subtitle="Choose a plan and pay securely with Razorpay. Manage students, attendance, seats, and communications in one workspace."
      />

      {sub ? (
        <GlassCard admin padding="md" className="admin-card-solid mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200/80">Current plan</p>
              <p className="mt-1 text-lg font-semibold capitalize text-white">
                {sub.plan || sub.currentPlanKey || 'none'} · {sub.subscriptionStatus || 'inactive'}
              </p>
              {sub.planExpiryDate ? (
                <p className="mt-1 text-sm text-white/65">
                  Expires {new Date(sub.planExpiryDate).toLocaleDateString('en-IN')}
                </p>
              ) : null}
            </div>
            {success ? (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-200">
                🎉 Subscription activated
              </div>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      {error ? (
        <GlassCard admin padding="md" className="admin-card-solid mb-6 border-red-400/30">
          <div className="text-sm text-red-200">
            <p>{error}</p>
            {/sign in|session expired/i.test(error) ? (
              <Link to="/login" className="mt-2 inline-block font-semibold text-teal-300 underline">
                Go to login
              </Link>
            ) : null}
          </div>
        </GlassCard>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sortedPlans.map((plan) => {
          const planId = plan._id || plan.id || '';
          const isCurrent = activePlanKey && plan.key.toLowerCase() === activePlanKey;
          const badge = planBadge(plan);

          return (
            <GlassCard
              admin
              key={planId}
              hover
              padding="md"
              className="subscription-plan-card admin-card-solid relative flex flex-col"
            >
              {badge ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md shadow-blue-500/30">
                  {badge}
                </span>
              ) : null}

              <h2 className="font-display text-xl font-bold text-white">{plan.name}</h2>
              <div className="mt-3 flex items-end gap-2">
                {plan.strikePrice && plan.strikePrice > plan.finalPrice ? (
                  <span className="text-lg text-white/45 line-through">₹{plan.strikePrice}</span>
                ) : null}
                <span className="text-3xl font-bold text-teal-300">₹{plan.finalPrice}</span>
              </div>
              <p className="mt-1 text-xs text-white/55">{planPeriodLabel(plan)}</p>
              {plan.description ? <p className="mt-2 text-sm text-white/65">{plan.description}</p> : null}

              <ul className="mt-4 flex-1 space-y-2 text-sm text-white/80">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Button
                className={`mt-6 w-full ${isCurrent ? 'admin-btn-current' : ''}`}
                variant="primary"
                disabled={paying !== null || isCurrent}
                onClick={() => {
                  setPayError('');
                  setCheckoutPlan(plan);
                }}
              >
                {isCurrent ? 'Current plan' : planCta(paying === planId)}
              </Button>
            </GlassCard>
          );
        })}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-white/55">
        <span>🔒</span> Secure Razorpay payment · PCI DSS compliant checkout
      </p>

      {checkoutPlan ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center">
          <GlassCard admin padding="md" className="payment-summary-card admin-card-solid w-full max-w-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-emerald-200/80">Payment summary</p>
                <h3 className="font-display text-xl font-bold text-white">{checkoutPlan.name}</h3>
              </div>
              <button type="button" className="text-white/60 hover:text-white" onClick={closeCheckout}>
                ✕
              </button>
            </div>

            {payError ? (
              <div className="mt-4 rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-3 text-sm text-red-100">
                <p className="font-semibold">Payment could not start</p>
                <p className="mt-1 text-red-200/90">{payError}</p>
                {/authentication failed|razorpay.*key|RAZORPAY/i.test(payError) ? (
                  <p className="mt-2 text-xs text-red-200/75">
                    Fix: Razorpay Dashboard → Test mode → API Keys → regenerate Key Secret → update{' '}
                    <code className="rounded bg-black/20 px-1">backend/.env</code> and restart backend.
                  </p>
                ) : null}
              </div>
            ) : null}

            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Plan</dt>
                <dd className="font-medium text-white">{checkoutPlan.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Duration</dt>
                <dd className="font-medium text-white">{planPeriodLabel(checkoutPlan)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-white/60">Price</dt>
                <dd className="font-medium text-white">₹{checkoutPlan.finalPrice}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3 text-base">
                <dt className="font-semibold text-white">Total</dt>
                <dd className="payment-summary-total font-bold">₹{finalAmount}</dd>
              </div>
            </dl>

            <p className="payment-summary-note mt-4 rounded-xl border px-3 py-2 text-center text-xs">
              🔒 Secure Razorpay payment
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button className="flex-1" disabled={paying !== null} onClick={() => pay(checkoutPlan)}>
                {paying ? 'Opening checkout…' : 'Pay with Razorpay'}
              </Button>
              <Button variant="ghost-dark" onClick={closeCheckout}>
                Cancel
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {success && sub?.planExpiryDate ? (
        <GlassCard admin padding="md" className="admin-card-solid mt-6 border-emerald-400/25">
          <h3 className="font-semibold text-emerald-200">Plan details</h3>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-white/60">Expiry date</dt>
              <dd className="font-medium text-white">
                {new Date(sub.planExpiryDate).toLocaleDateString('en-IN')}
              </dd>
            </div>
            {sub.planStartDate ? (
              <div>
                <dt className="text-white/60">Started</dt>
                <dd className="font-medium text-white">
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
