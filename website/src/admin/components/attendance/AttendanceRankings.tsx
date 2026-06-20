import { Link } from 'react-router-dom';
import type { StudentAttendanceRank } from '../../utils/attendanceHelpers';

type AttendanceRankingsProps = {
  top: StudentAttendanceRank[];
  low: StudentAttendanceRank[];
  onSendWarning: (studentId: string, name: string) => void;
  loading?: boolean;
};

export function AttendanceRankings({ top, low, onSendWarning, loading }: AttendanceRankingsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="admin-skeleton h-48 rounded-2xl" />
        <div className="admin-skeleton h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="admin-card rounded-2xl p-4">
        <h3 className="font-semibold text-white">🏆 Highest attendance</h3>
        {top.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No data yet this month.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {top.map((s, i) => (
              <li key={s.studentId} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-sm">
                <span className="font-medium text-slate-900">
                  {i + 1}. {s.studentName}
                </span>
                <span className="font-bold text-emerald-700">{s.pct}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-card rounded-2xl p-4">
        <h3 className="font-semibold text-white">⚠ Below 50% attendance</h3>
        {low.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No low attendance alerts.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {low.map((s) => (
              <li key={s.studentId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{s.studentName}</p>
                  <p className="text-xs text-amber-700">{s.pct}% this month</p>
                </div>
                <button
                  type="button"
                  onClick={() => onSendWarning(s.studentId, s.studentName)}
                  className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900"
                >
                  Send warning
                </button>
              </li>
            ))}
          </ul>
        )}
        <Link to="/admin/students" className="mt-3 inline-block text-xs font-semibold text-primary underline">
          View all students
        </Link>
      </div>
    </div>
  );
}
