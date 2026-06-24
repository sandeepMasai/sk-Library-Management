import { formatItemDate, type MonthlyFeeItem } from '../utils/monthlyCollection';

type AdminFeePanelProps = {
  monthlyTotal: number;
  pending: number;
  paidStudents: number;
  pendingStudents: number;
  items: MonthlyFeeItem[];
};

export function AdminFeePanel({
  monthlyTotal,
  pending,
  paidStudents,
  pendingStudents,
  items,
}: AdminFeePanelProps) {
  const admissionTotal = items
    .filter((i) => i.type === 'admission')
    .reduce((s, i) => s + i.amount, 0);
  const renewalTotal = items
    .filter((i) => i.type === 'renewal')
    .reduce((s, i) => s + i.amount, 0);
  const goal = monthlyTotal + pending;
  const pct = goal > 0 ? Math.round((monthlyTotal / goal) * 100) : monthlyTotal > 0 ? 100 : 0;

  return (
    <section className="admin-panel admin-card h-full rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-white">Fee Collection (This Month)</h2>
      <p className="mt-1 text-xs text-muted">
        Admission + renewal fees collected in {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/15 bg-white/10 p-3">
          <p className="text-xs text-muted">Total collected</p>
          <p className="mt-1 text-xl font-bold text-slate-900">₹{monthlyTotal.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-amber-200/40 bg-white/10 p-3">
          <p className="text-xs text-amber-800/80">Pending fees</p>
          <p className="mt-1 text-xl font-bold text-amber-900">₹{pending.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl border border-accent/25 bg-white/10 p-3">
          <p className="text-xs text-accent/90">Admission</p>
          <p className="mt-1 text-lg font-bold text-slate-900">₹{admissionTotal.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-accent/80">{items.filter((i) => i.type === 'admission').length} student(s)</p>
        </div>
        <div className="rounded-xl border border-primary/25 bg-white/10 p-3">
          <p className="text-xs text-primary/90">Renewal</p>
          <p className="mt-1 text-lg font-bold text-slate-900">₹{renewalTotal.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-primary/80">{items.filter((i) => i.type === 'renewal').length} renew(s)</p>
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

      <div className="mt-5">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">Who paid this month</p>
        {items.length === 0 ? (
          <p className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-center text-sm text-muted">
            No fee collected this month yet.
          </p>
        ) : (
          <ul className="mt-2 max-h-52 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.studentName}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <span
                      className={`rounded-full px-2 py-0.5 font-semibold ${
                        item.type === 'renewal'
                          ? 'bg-primary/15 text-primary'
                          : 'bg-accent/15 text-accent'
                      }`}
                    >
                      {item.label}
                    </span>
                    <span>{formatItemDate(item.date)}</span>
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">
                  ₹{item.amount.toLocaleString('en-IN')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-xs text-muted">
        <span>{paidStudents} paid · {pendingStudents} pending (all time)</span>
        <span>{items.length} collection(s) this month</span>
      </div>
    </section>
  );
}
