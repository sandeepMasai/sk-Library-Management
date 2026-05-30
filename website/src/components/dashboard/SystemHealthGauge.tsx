type SystemHealthGaugeProps = {
  label: string;
  value: number;
  dark?: boolean;
};

export function SystemHealthGauge({ label, value, dark = true }: SystemHealthGaugeProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color = clamped >= 90 ? '#34d399' : clamped >= 70 ? '#fbbf24' : '#f87171';

  return (
    <div
      className={`animate-kpi flex flex-col items-center rounded-2xl border p-5 ${
        dark ? 'glass-panel-dark border-white/10' : 'border-slate-200 bg-white shadow-sm'
      }`}
    >
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
          <circle cx="18" cy="18" r="15.5" fill="none" stroke={dark ? 'rgba(255,255,255,0.08)' : '#e2e8f0'} strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${clamped} ${100 - clamped}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
          {clamped}%
        </span>
      </div>
      <p className={`mt-3 text-center text-xs font-semibold uppercase tracking-wide ${dark ? 'text-slate-400' : 'text-muted'}`}>
        {label}
      </p>
    </div>
  );
}
