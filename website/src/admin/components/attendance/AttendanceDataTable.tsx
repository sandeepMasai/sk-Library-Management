import { Button } from '../../../components/ui/Button';
import { AdminEmptyState } from '../AdminEmptyState';
import type { EnrichedAttendanceRow } from '../../utils/attendanceHelpers';
import { statusPill } from '../../utils/attendanceHelpers';

type AttendanceDataTableProps = {
  rows: EnrichedAttendanceRow[];
  search: string;
  loading?: boolean;
  selectedIds: Set<string>;
  onSearchChange: (v: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onViewStudent?: (studentId: string) => void;
};

export function AttendanceDataTable({
  rows,
  search,
  loading,
  selectedIds,
  onSearchChange,
  onToggleSelect,
  onToggleAll,
  onViewStudent,
}: AttendanceDataTableProps) {
  const q = search.trim().toLowerCase();
  const visible = rows.filter(
    (r) => !q || r.studentName.toLowerCase().includes(q) || String(r.seatNumber ?? '').includes(q)
  );
  const allSelected = visible.length > 0 && visible.every((r) => selectedIds.has(r.id));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-14 rounded-xl" />
        ))}
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <AdminEmptyState
        icon="📅"
        title="No attendance found"
        description="No attendance records available for this period."
      />
    );
  }

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search student…"
        className="focus-ring-brand admin-card mb-4 w-full max-w-md rounded-xl px-4 py-2.5 text-sm text-white"
      />

      <div className="hidden md:block">
        <table className="attendance-table w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-muted">
              <th className="pb-3 pr-2">
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} className="rounded" />
              </th>
              <th className="pb-3 pr-3 font-semibold">Student</th>
              <th className="pb-3 pr-3 font-semibold">Seat</th>
              <th className="pb-3 pr-3 font-semibold">Check in</th>
              <th className="pb-3 pr-3 font-semibold">Check out</th>
              <th className="pb-3 pr-3 font-semibold">Duration</th>
              <th className="pb-3 pr-3 font-semibold">Status</th>
              <th className="pb-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const pill = statusPill(row.status);
              return (
                <tr key={row.id} className="attendance-table-row border-b border-slate-50">
                  <td className="py-3 pr-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => onToggleSelect(row.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="py-3 pr-3 font-medium text-slate-900">{row.studentName}</td>
                  <td className="py-3 pr-3 text-muted">{row.seatNumber ? `Seat ${row.seatNumber}` : '—'}</td>
                  <td className="py-3 pr-3">⏰ {row.checkIn}</td>
                  <td className="py-3 pr-3 text-muted">{row.checkOut}</td>
                  <td className="py-3 pr-3 text-muted">{row.duration}</td>
                  <td className="py-3 pr-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill.className}`}>
                      {pill.label}
                    </span>
                  </td>
                  <td className="py-3">
                    {onViewStudent ? (
                      <Button size="sm" variant="ghost" onClick={() => onViewStudent(row.studentId)}>
                        View
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {visible.map((row) => {
          const pill = statusPill(row.status);
          return (
            <div key={row.id} className="attendance-mobile-card admin-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">👤 {row.studentName}</p>
                  <p className="mt-1 text-sm text-muted">
                    {row.seatNumber ? `💺 Seat ${row.seatNumber}` : 'No seat'} · ⏰ {row.checkIn}
                  </p>
                </div>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${pill.className}`}>
                  {pill.label}
                </span>
              </div>
              {onViewStudent ? (
                <button
                  type="button"
                  onClick={() => onViewStudent(row.studentId)}
                  className="mt-3 w-full rounded-xl bg-primary/10 py-2 text-sm font-semibold text-primary"
                >
                  View details
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
