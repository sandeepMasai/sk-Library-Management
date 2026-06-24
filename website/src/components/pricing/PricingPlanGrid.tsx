import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { GlassCard } from '../ui/GlassCard';
import type { PublicPlan } from '../../lib/plansApi';
import {
  formatInr,
  formatPlanDuration,
  formatPlansUpdatedAt,
  isPlanHighlighted,
  planDisplayTag,
  planFeatureList,
} from '../../utils/planDisplay';

type PricingPlanGridProps = {
  plans: PublicPlan[];
  updatedAt?: string | null;
  loading?: boolean;
  error?: string;
};

export function PricingPlanGrid({ plans, updatedAt, loading, error }: PricingPlanGridProps) {
  const updatedLabel = formatPlansUpdatedAt(updatedAt);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-96 rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!plans.length) {
    return (
      <GlassCard dark padding="md" className="text-center">
        <p className="text-sm text-white/70">{error || 'No plans available right now. Please check back soon.'}</p>
      </GlassCard>
    );
  }

  return (
    <>
      {updatedLabel ? (
        <p className="mb-6 text-center text-xs text-white/50">
          Plans last updated {updatedLabel}
        </p>
      ) : null}

      <div className="grid gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-4">
        {plans.map((plan) => {
          const tag = planDisplayTag(plan);
          const highlighted = isPlanHighlighted(plan);
          const features = planFeatureList(plan);
          const showStrike =
            plan.strikePrice != null && Number(plan.strikePrice) > Number(plan.finalPrice);

          return (
            <GlassCard
              key={plan.key}
              dark
              hover
              padding="lg"
              className={`relative flex flex-col ${
                highlighted ? 'ring-2 ring-teal-400/50 shadow-lg shadow-teal-500/20' : ''
              }`}
            >
              {tag ? (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-bold text-white ${
                    highlighted ? 'bg-gradient-to-r from-primary to-accent shadow-lg' : 'bg-primary'
                  }`}
                >
                  {tag}
                </span>
              ) : null}

              <h2 className="text-xl font-bold text-white">{plan.name}</h2>

              <div className="mt-3 flex flex-wrap items-end gap-2">
                {showStrike ? (
                  <span className="text-lg text-white/45 line-through">{formatInr(Number(plan.strikePrice))}</span>
                ) : null}
                <p className="text-4xl font-extrabold text-teal-300">{formatInr(plan.finalPrice)}</p>
              </div>

              <p className="text-sm text-white/60">per {formatPlanDuration(plan)}</p>

              {plan.discount && plan.discount > 0 ? (
                <p className="mt-2 inline-flex w-fit rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-200">
                  {plan.discount}% off
                </p>
              ) : null}

              {plan.promoDaysRemaining != null && plan.promoDaysRemaining >= 0 ? (
                <p className="mt-2 text-xs font-semibold text-amber-200">
                  Offer ends in {plan.promoDaysRemaining} day{plan.promoDaysRemaining === 1 ? '' : 's'}
                </p>
              ) : null}

              {plan.campaignName ? (
                <p className="mt-2 text-xs font-medium text-violet-200">{plan.campaignName}</p>
              ) : null}

              <ul className="mt-6 flex-1 space-y-3 border-t border-white/10 pt-6">
                {features.map((f) => (
                  <li key={f} className="flex gap-2 text-sm text-white/75">
                    <span className="text-teal-300">✓</span> {f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-8 block">
                <Button
                  variant={highlighted ? 'primary' : 'outline'}
                  fullWidth
                  className={!highlighted ? '!border-white/30 !bg-white/5 !text-white hover:!bg-white/15' : undefined}
                >
                  Get started
                </Button>
              </Link>
            </GlassCard>
          );
        })}
      </div>
    </>
  );
}
