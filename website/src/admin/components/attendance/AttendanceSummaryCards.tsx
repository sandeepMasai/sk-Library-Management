import { DashboardKpiCard } from '../../../components/dashboard/DashboardKpiCard';

type AttendanceSummaryCardsProps = {
  present: number;
  absent: number;
  ratePct: number;
  late: number;
  blocked: number;
  loading?: boolean;
};

export function AttendanceSummaryCards({
  present,
  absent,
  ratePct,
  late,
  blocked,
  loading,
}: AttendanceSummaryCardsProps) {
  if (loading) {
    return (
      <div className="attendance-kpi-scroll flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-28 min-w-[10rem] shrink-0 rounded-2xl sm:min-w-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="attendance-kpi-scroll flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-5">
      <div className="min-w-[10rem] shrink-0 sm:min-w-0">
        <DashboardKpiCard index={0} label="Present today" value={present} hint="Students" icon="🟢" accent="green" dark />
      </div>
      <div className="min-w-[10rem] shrink-0 sm:min-w-0">
        <DashboardKpiCard index={1} label="Absent today" value={absent} hint="Students" icon="🔴" accent="amber" dark />
      </div>
      <div className="min-w-[10rem] shrink-0 sm:min-w-0">
        <DashboardKpiCard index={2} label="Attendance rate" value={`${ratePct}%`} icon="📊" accent="blue" dark />
      </div>
      <div className="min-w-[10rem] shrink-0 sm:min-w-0">
        <DashboardKpiCard index={3} label="Late entries" value={late} hint="After 10 AM" icon="⏰" accent="purple" dark />
      </div>
      <div className="min-w-[10rem] shrink-0 sm:min-w-0">
        <DashboardKpiCard index={4} label="Expired attempts" value={blocked} icon="⚠️" accent="cyan" dark />
      </div>
    </div>
  );
}
