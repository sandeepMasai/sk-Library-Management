import { Link } from 'react-router-dom';

type AdminMembershipPanelProps = {
  active: number;
  expiringSoon: number;
  expired: number;
  pendingRenewals: number;
};

export function AdminMembershipPanel({
  active,
  expiringSoon,
  expired,
  pendingRenewals,
}: AdminMembershipPanelProps) {
  return (
    <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Membership Status</h2>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl border border-emerald-200/40 bg-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-sm font-medium text-white/90">Active students</span>
          </div>
          <span className="text-lg font-bold text-emerald-200">{active}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-amber-200/40 bg-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-sm font-medium text-white/90">Expiring soon</span>
          </div>
          <span className="text-lg font-bold text-amber-200">{expiringSoon}</span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-rose-200/40 bg-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="text-sm font-medium text-white/90">Expired membership</span>
          </div>
          <span className="text-lg font-bold text-rose-200">{expired}</span>
        </div>
      </div>

      {pendingRenewals > 0 ? (
        <p className="mt-3 text-xs text-muted">{pendingRenewals} renewal request(s) waiting for review.</p>
      ) : null}

      <Link
        to="/admin/students"
        className="mt-4 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/20 transition hover:brightness-110"
      >
        Send renewal reminder
      </Link>
    </section>
  );
}
