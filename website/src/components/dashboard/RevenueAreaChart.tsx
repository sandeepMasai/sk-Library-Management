type RevenueAreaChartProps = {
  label?: string;
  value: number;
  dark?: boolean;
};

export function RevenueAreaChart({ label = 'Revenue Growth', value, dark = true }: RevenueAreaChartProps) {
  const points = buildTrendPoints(value);
  const pathD = pointsToSmoothPath(points);
  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${dark ? 'glass-panel-dark border-white/10' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className={`font-display text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{label}</h2>
          <p className={`mt-0.5 text-sm ${dark ? 'text-slate-400' : 'text-muted'}`}>Platform subscription revenue</p>
        </div>
        <p className={`text-xl font-bold ${dark ? 'text-cyan-300' : 'text-primary'}`}>
          ₹{value.toLocaleString('en-IN')}
        </p>
      </div>
      <div className="mt-4 h-44 w-full">
        <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={dark ? 'rgba(34,211,238,0.35)' : 'rgba(45,143,127,0.35)'} />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#revFill)" className="animate-chart-fill" />
          <path
            d={pathD}
            fill="none"
            stroke={dark ? '#22d3ee' : '#2d8f7f'}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
            className="animate-chart-line"
            style={{ filter: dark ? 'drop-shadow(0 0 6px rgba(34,211,238,0.6))' : undefined }}
          />
        </svg>
      </div>
    </div>
  );
}

function buildTrendPoints(total: number): [number, number][] {
  const base = Math.max(total * 0.4, 1);
  const steps = [0.55, 0.62, 0.58, 0.72, 0.78, 0.85, 0.92, 1];
  return steps.map((s, i) => {
    const x = (i / (steps.length - 1)) * 100;
    const y = 100 - (base * s) / Math.max(total, 1) * 75 - 10;
    return [x, Math.min(92, Math.max(8, y))] as [number, number];
  });
}

function pointsToSmoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    const [px, py] = points[i - 1];
    const cx = (px + x) / 2;
    d += ` Q ${cx} ${py}, ${x} ${y}`;
  }
  return d;
}
