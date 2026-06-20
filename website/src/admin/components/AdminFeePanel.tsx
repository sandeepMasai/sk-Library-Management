type AdminFeePanelProps = {
  collected: number;
  pending: number;
  paidStudents: number;
  pendingStudents: number;
};

export function AdminFeePanel({ collected, pending, paidStudents, pendingStudents }: AdminFeePanelProps) {
  const total = collected + pending;
  const pct = total > 0 ? Math.round((collected / total) * 100) : 0;

  return (
    <section className="admin-panel admin-card h-full rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Fee Collection (This Month)</h2>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs text-muted">Current revenue</p>
          <p className="mt-1 text-xl font-bold text-slate-900">₹{collected.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-amber-200/40 bg-white/10 p-3">
          <p className="text-xs text-amber-800/80">Pending fees</p>
          <p className="mt-1 text-xl font-bold text-amber-900">₹{pending.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-emerald-200/40 bg-white/10 p-3">
          <p className="text-xs text-emerald-800/80">Paid students</p>
          <p className="mt-1 text-xl font-bold text-emerald-900">{paidStudents}</p>
        </div>
        <div className="rounded-xl border border-rose-200/40 bg-white/10 p-3">
          <p className="text-xs text-rose-800/80">Pending students</p>
          <p className="mt-1 text-xl font-bold text-rose-900">{pendingStudents}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium">
          <span className="text-muted">Collection progress</span>
          <span className="text-primary">{pct}% collected</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
