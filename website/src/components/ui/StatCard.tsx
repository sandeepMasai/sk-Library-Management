type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'dark';
  className?: string;
};

const toneStyles = {
  default: 'border-slate-200/80 bg-white',
  success: 'border-emerald-200/80 bg-emerald-50/50',
  warning: 'border-amber-200/80 bg-amber-50/50',
  dark: 'glass-panel-dark border-white/10 text-white',
};

export function StatCard({ label, value, hint, tone = 'default', className = '' }: StatCardProps) {
  const isDark = tone === 'dark';

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition sm:p-6 ${toneStyles[tone]} ${className}`}
    >
      <p className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-teal-200/70' : 'text-muted'}`}>
        {label}
      </p>
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-slate-900'}`}>{value}</p>
      {hint ? <p className={`mt-1 text-xs ${isDark ? 'text-white/50' : 'text-muted'}`}>{hint}</p> : null}
    </div>
  );
}
