import { Link } from 'react-router-dom';
import type { StudentRow } from '../api/libraryApi';
import { formatExpiry, statusBadge } from '../utils/studentHelpers';

const RECENT_LIMIT = 5;

type AdminRecentStudentsProps = {
  students: StudentRow[];
  loading?: boolean;
};

export function AdminRecentStudents({ students, loading }: AdminRecentStudentsProps) {
  const rows = students.slice(0, RECENT_LIMIT);

  return (
    <section className="admin-panel admin-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-bold text-white">Recent Students</h2>
        <Link to="/admin/students" className="text-xs font-semibold text-white/80 hover:text-white hover:underline">
          View all
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: RECENT_LIMIT }).map((_, i) => (
            <div key={i} className="admin-skeleton h-12 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-6 text-center">
          <span className="text-4xl" aria-hidden>
            👨‍🎓
          </span>
          <p className="mt-3 font-medium text-white">No students added yet</p>
          <p className="mt-1 text-sm text-white/60">Add your first member to start tracking attendance and fees.</p>
          <Link
            to="/admin/students"
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            Add student
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="admin-table w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/60">
                <th className="pb-3 pr-3 font-semibold">Name</th>
                <th className="pb-3 pr-3 font-semibold">Phone</th>
                <th className="pb-3 pr-3 font-semibold">Status</th>
                <th className="pb-3 pr-3 font-semibold">Expiry</th>
                <th className="pb-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((student) => {
                const badge = statusBadge(student);
                return (
                  <tr key={student.id} className="border-b border-white/10 last:border-0 hover:bg-white/5">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white">
                          {student.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-white">{student.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-white/70">{student.mobile || '—'}</td>
                    <td className="py-3 pr-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-white/70">{formatExpiry(student.expiryDate)}</td>
                    <td className="py-3">
                      <Link to="/admin/students" className="text-xs font-semibold text-white/80 hover:text-white hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
