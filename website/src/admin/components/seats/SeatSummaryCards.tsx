import { DashboardKpiCard } from '../../../components/dashboard/DashboardKpiCard';

type SeatSummaryCardsProps = {
  stats: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
    rate: number;
  };
  loading?: boolean;
};

function pct(part: number, total: number) {
  if (!total) return '0%';
  return `${Math.round((part / total) * 100)}%`;
}

export function SeatSummaryCards({ stats, loading }: SeatSummaryCardsProps) {
  if (loading) {
    return (
      <div className="seat-kpi-scroll flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-32 min-w-[10rem] shrink-0 rounded-2xl lg:min-w-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="seat-kpi-scroll flex gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
      <div className="min-w-[10rem] shrink-0 lg:min-w-0">
        <DashboardKpiCard
          index={0}
          label="Total seats"
          value={stats.total}
          hint="All floors"
          icon="💺"
          accent="blue"
          dark
        />
      </div>
      <div className="min-w-[10rem] shrink-0 lg:min-w-0">
        <DashboardKpiCard
          index={1}
          label="Occupied seats"
          value={stats.occupied}
          hint={`${pct(stats.occupied, stats.total)} of total`}
          icon="🟢"
          accent="purple"
          dark
        />
      </div>
      <div className="min-w-[10rem] shrink-0 lg:min-w-0">
        <DashboardKpiCard
          index={2}
          label="Available seats"
          value={stats.available}
          hint={`${pct(stats.available, stats.total)} of total`}
          icon="⚪"
          accent="green"
          dark
        />
      </div>
      <div className="min-w-[10rem] shrink-0 lg:min-w-0">
        <DashboardKpiCard
          index={3}
          label="Reserved seats"
          value={stats.reserved}
          hint={`${pct(stats.reserved, stats.total)} of total`}
          icon="🟡"
          accent="amber"
          dark
        />
      </div>
      <div className="min-w-[10rem] shrink-0 lg:min-w-0">
        <DashboardKpiCard
          index={4}
          label="Occupancy rate"
          value={`${stats.rate}%`}
          hint="Library-wide"
          icon="📊"
          accent="cyan"
          dark
        />
      </div>
    </div>
  );
}
