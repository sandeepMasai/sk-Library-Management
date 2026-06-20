import { Link } from 'react-router-dom';

type AdminReportsPanelProps = {
  monthlyRevenue?: number;
  todayAttendance?: number;
  feeDueCount?: number;
  studentTotal?: number;
  paymentCount?: number;
};

export function AdminReportsPanel({
  monthlyRevenue = 0,
  todayAttendance = 0,
  feeDueCount = 0,
  studentTotal = 0,
  paymentCount = 0,
}: AdminReportsPanelProps) {
  const reports = [
    {
      label: 'Daily attendance',
      to: '/admin/attendance',
      icon: '📅',
      hint: `${todayAttendance} today`,
    },
    {
      label: 'Monthly revenue',
      to: '/admin/students',
      icon: '💰',
      hint: `₹${monthlyRevenue.toLocaleString('en-IN')}`,
    },
    {
      label: 'Fee pending',
      to: '/admin/students',
      icon: '⚠️',
      hint: `${feeDueCount} students`,
    },
    {
      label: 'Student growth',
      to: '/admin/students',
      icon: '📈',
      hint: `${studentTotal} total`,
    },
  ];

  return (
    <section className="admin-panel admin-card h-full rounded-2xl p-4 sm:p-5">
      <h2 className="font-display text-base font-bold text-slate-900">Quick Reports</h2>
      <p className="mt-1 text-xs text-muted">{paymentCount} payments logged via API</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {reports.map((report) => (
          <Link
            key={report.label}
            to={report.to}
            className="flex flex-col gap-1 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-sm font-medium text-white transition hover:bg-white/15"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>{report.icon}</span>
              {report.label}
            </span>
            <span className="text-xs font-normal text-muted">{report.hint}</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to="/admin/attendance"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
        >
          Attendance report
        </Link>
        <Link
          to="/admin/students"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15"
        >
          Student & fee list
        </Link>
      </div>
    </section>
  );
}
