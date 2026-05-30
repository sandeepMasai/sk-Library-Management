type DashboardKpiCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: string;
  trend?: string;
  dark?: boolean;
  accent?: 'blue' | 'green' | 'amber' | 'purple' | 'cyan';
  index?: number;
};

const accentMap = {
  blue: { light: 'bg-blue-50 text-blue-600', dark: 'bg-blue-500/15 text-blue-300' },
  green: { light: 'bg-emerald-50 text-emerald-600', dark: 'bg-emerald-500/15 text-emerald-300' },
  amber: { light: 'bg-amber-50 text-amber-600', dark: 'bg-amber-500/15 text-amber-300' },
  purple: { light: 'bg-violet-50 text-violet-600', dark: 'bg-violet-500/15 text-violet-300' },
  cyan: { light: 'bg-cyan-50 text-cyan-600', dark: 'bg-cyan-500/15 text-cyan-300' },
};

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon,
  trend,
  dark = false,
  accent = 'blue',
  index = 0,
}: DashboardKpiCardProps) {
  const accentClass = accentMap[accent][dark ? 'dark' : 'light'];

  return (
    <div
      className={`animate-kpi rounded-2xl border p-5 transition sm:p-6 ${
        dark
          ? 'glass-panel-dark border-white/10 hover-lift-dark'
          : 'border-slate-200/80 bg-white shadow-sm hover-lift'
      }`}
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-muted'}`}>
            {label}
          </p>
          <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${dark ? 'text-white' : 'text-slate-900'}`}>
            {value}
          </p>
          {hint ? (
            <p className={`mt-1 text-xs ${dark ? 'text-slate-500' : 'text-muted'}`}>{hint}</p>
          ) : null}
          {trend ? (
            <p className="mt-2 text-xs font-medium text-emerald-500">{trend}</p>
          ) : null}
        </div>
        {icon ? (
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg ${accentClass}`}>
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
