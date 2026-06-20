import type { TrendPoint } from '../../utils/attendanceHelpers';

type AttendanceAnalyticsProps = {
  daily: TrendPoint[];
  weekly: TrendPoint[];
  monthly: TrendPoint[];
  tab: 'daily' | 'weekly' | 'monthly';
  onTabChange: (t: 'daily' | 'weekly' | 'monthly') => void;
  loading?: boolean;
};

const CHART_HEIGHT = 168;

function Chart({ points, loading }: { points: TrendPoint[]; loading?: boolean }) {
  if (loading) {
    return <div className="admin-skeleton mt-4 rounded-2xl" style={{ height: CHART_HEIGHT + 48 }} />;
  }

  if (points.length === 0) {
    return <p className="mt-4 text-sm text-white/60">No trend data available.</p>;
  }

  const max = Math.max(...points.map((p) => p.value), 1);
  const total = points.reduce((sum, p) => sum + p.value, 0);

  if (total === 0) {
    return (
      <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/8 py-10">
        <p className="text-sm font-medium text-white/80">No check-ins in this period</p>
        <p className="mt-1 text-xs text-white/50">Bars will appear when students mark attendance</p>
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto pb-1">
      <div
        className="flex min-w-[280px] items-end justify-between gap-2 px-1"
        style={{ height: CHART_HEIGHT }}
      >
        {points.map((point) => {
          const barHeight = Math.max(
            point.value > 0 ? 10 : 4,
            Math.round((point.value / max) * (CHART_HEIGHT - 36))
          );
          return (
            <div
              key={point.dateStr}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-1 text-[10px] font-semibold leading-none text-emerald-200">
                {point.rate}%
              </span>
              <div
                className="w-full max-w-[2.75rem] rounded-t-lg bg-gradient-to-t from-primary to-accent shadow-sm transition-all"
                style={{ height: barHeight }}
                title={`${point.value} present · ${point.dateStr}`}
              />
              <span className="mt-1.5 max-w-full truncate text-center text-[10px] text-white/60">
                {point.label}
              </span>
              <span className="text-[9px] font-medium text-white/50">{point.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const TAB_HINT: Record<'daily' | 'weekly' | 'monthly', string> = {
  daily: 'Last 7 days — present count per day',
  weekly: 'Last 7 days — attendance trend',
  monthly: 'Last 14 days — attendance trend',
};

export function AttendanceAnalytics({ daily, weekly, monthly, tab, onTabChange, loading }: AttendanceAnalyticsProps) {
  const points = tab === 'weekly' ? weekly : tab === 'monthly' ? monthly : daily;

  return (
    <div className="attendance-analytics-card admin-card rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Attendance analytics</h2>
          <p className="text-xs text-white/60">{TAB_HINT[tab]}</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/15 bg-white/8 p-1">
          {(['daily', 'weekly', 'monthly'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTabChange(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                tab === t
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <Chart points={points} loading={loading} />
    </div>
  );
}
