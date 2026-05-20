import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { ensureSession } from '../../lib/http';
import { openRazorpayCheckout } from '../../lib/razorpayWeb';
import { fetchPlans, fetchSubscriptionMe, type PlanRow } from '../api/libraryApi';

export function AdminSubscription() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [sub, setSub] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);

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
        setSub(s as Record<string, unknown>);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : 'Failed to load';
        if (!/session expired|sign in/i.test(msg)) {
          setError(msg);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

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
      setSub(fresh as Record<string, unknown>);
      alert('Payment successful! Your plan is now active.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment failed');
    } finally {
      setPaying(null);
    }
  }

  return (
    <div className="page-pad">
      <h1 className="text-2xl font-bold text-slate-900">Subscription</h1>
      <p className="mt-1 text-sm text-muted">Pay with Razorpay to activate your library plan.</p>

      {sub ? (
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <p className="text-sm text-muted">Current status</p>
          <p className="mt-1 text-lg font-semibold capitalize">
            {(sub.plan as string) || 'none'} · {(sub.subscriptionStatus as string) || 'inactive'}
          </p>
          {sub.planExpiryDate ? (
            <p className="mt-1 text-sm text-muted">
              Expires: {new Date(String(sub.planExpiryDate)).toLocaleDateString('en-IN')}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          {/sign in|session expired/i.test(error) ? (
            <Link to="/login" className="mt-2 inline-block font-semibold text-primary underline">
              Go to login
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div key={plan._id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-bold text-slate-900">{plan.name}</h2>
            <p className="mt-2 text-2xl font-bold text-primary">₹{plan.finalPrice}</p>
            <p className="text-xs text-muted">{plan.duration} days</p>
            <Button
              className="mt-4 w-full"
              disabled={paying !== null}
              onClick={() => pay(plan)}
            >
              {paying === (plan._id || plan.id) ? 'Processing…' : 'Pay now'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
