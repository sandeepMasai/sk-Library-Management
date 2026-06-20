import { DashboardKpiCard } from '../../../components/dashboard/DashboardKpiCard';

type StudentSummaryCardsProps = {
  stats: {
    total: number;
    active: number;
    expiring: number;
    expired: number;
    feeDue: number;
  };
  loading?: boolean;
};

export function StudentSummaryCards({ stats, loading }: StudentSummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <DashboardKpiCard index={0} label="Total students" value={stats.total} icon="👨‍🎓" accent="blue" dark />
      <DashboardKpiCard index={1} label="Active students" value={stats.active} icon="🟢" accent="green" dark />
      <DashboardKpiCard index={2} label="Expiring soon" value={stats.expiring} icon="🟡" accent="amber" dark />
      <DashboardKpiCard index={3} label="Expired students" value={stats.expired} icon="🔴" accent="purple" dark />
      <DashboardKpiCard index={4} label="Fee due students" value={stats.feeDue} icon="💰" accent="cyan" dark />
    </div>
  );
}
