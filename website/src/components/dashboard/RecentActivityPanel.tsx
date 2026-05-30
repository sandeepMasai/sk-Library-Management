type ActivityItem = {
  id: string;
  title: string;
  subtitle?: string;
  time?: string;
  icon?: string;
};

type RecentActivityPanelProps = {
  items: ActivityItem[];
  loading?: boolean;
  dark?: boolean;
};

export function RecentActivityPanel({ items, loading, dark = false }: RecentActivityPanelProps) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-5 sm:p-6 ${
        dark ? 'glass-panel-dark border-white/10' : 'border-slate-200/80 bg-white shadow-sm'
      }`}
    >
      <h2 className={`font-display text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Recent Activity</h2>
      <p className={`mt-0.5 text-sm ${dark ? 'text-slate-400' : 'text-muted'}`}>Live check-ins & updates</p>

      <ul className="mt-5 flex-1 space-y-3 overflow-auto">
        {loading ? (
          <li className={`py-8 text-center text-sm ${dark ? 'text-slate-500' : 'text-muted'}`}>Loading…</li>
        ) : items.length === 0 ? (
          <li className={`py-8 text-center text-sm ${dark ? 'text-slate-500' : 'text-muted'}`}>No recent activity</li>
        ) : (
          items.map((item) => (
            <li
              key={item.id}
              className={`flex gap-3 rounded-xl border p-3 ${
                dark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm ${
                  dark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-primary/10 text-primary'
                }`}
              >
                {item.icon || '✓'}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${dark ? 'text-white' : 'text-slate-900'}`}>
                  {item.title}
                </p>
                {item.subtitle ? (
                  <p className={`truncate text-xs ${dark ? 'text-slate-500' : 'text-muted'}`}>{item.subtitle}</p>
                ) : null}
                {item.time ? (
                  <p className={`mt-0.5 text-[11px] ${dark ? 'text-slate-600' : 'text-slate-400'}`}>{item.time}</p>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
