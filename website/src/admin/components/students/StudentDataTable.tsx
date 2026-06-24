import type { EnrichedStudent } from '../../utils/studentHelpers';
import { formatExpiry, statusBadge } from '../../utils/studentHelpers';
import { StudentQuickMenu } from './StudentQuickMenu';

type StudentDataTableProps = {
  students: EnrichedStudent[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onFees: (id: string) => void;
  onAttendance: (id: string) => void;
  onBlock: (id: string) => void;
  onDelete: (id: string) => void;
  onMessage: (id: string) => void;
};

export function StudentDataTable({
  students,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onView,
  onEdit,
  onFees,
  onAttendance,
  onBlock,
  onDelete,
  onMessage,
}: StudentDataTableProps) {
  const allSelected = students.length > 0 && students.every((s) => selectedIds.has(s.id));

  return (
    <div className="student-table-wrap hidden md:block">
      <table className="student-table w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-muted">
            <th className="pb-3 pr-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="admin-checkbox"
                aria-label="Select all"
              />
            </th>
            <th className="pb-3 pr-3 font-semibold">Profile</th>
            <th className="pb-3 pr-3 font-semibold">Student name</th>
            <th className="pb-3 pr-3 font-semibold">Student ID</th>
            <th className="pb-3 pr-3 font-semibold">Phone</th>
            <th className="pb-3 pr-3 font-semibold">Seat</th>
            <th className="pb-3 pr-3 font-semibold">Membership</th>
            <th className="pb-3 pr-3 font-semibold">Fee</th>
            <th className="pb-3 pr-3 font-semibold">Attendance</th>
            <th className="pb-3 pr-3 font-semibold">Expiry</th>
            <th className="pb-3 pr-3 font-semibold">Status</th>
            <th className="pb-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => {
            const badge = statusBadge(student);
            return (
              <tr
                key={student.id}
                className="student-table-row border-b border-slate-50 last:border-0"
              >
                <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(student.id)}
                    onChange={() => onToggleSelect(student.id)}
                    className="admin-checkbox"
                  />
                </td>
                <td className="py-3 pr-3">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-3">
                  <p className="font-semibold text-slate-900">{student.name}</p>
                  <p className="text-xs text-muted">@{student.username}</p>
                </td>
                <td className="py-3 pr-3 font-mono text-xs text-slate-600">{student.displayId}</td>
                <td className="py-3 pr-3 text-slate-600">📱 {student.mobile}</td>
                <td className="py-3 pr-3 text-slate-600">
                  {student.seatNumber ? `💺 ${student.seatNumber}` : '—'}
                </td>
                <td className="py-3 pr-3 text-slate-600">📅 {student.membershipPlan}</td>
                <td className="py-3 pr-3">
                  <span className="font-medium text-slate-900">💰 {student.feeStatus}</span>
                </td>
                <td className="py-3 pr-3">
                  {student.attendancePct != null ? (
                    <span
                      className={`font-semibold ${
                        student.attendancePct >= 70 ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      📊 {student.attendancePct}%
                    </span>
                  ) : (
                    <span className="text-muted">{student.presentToday ? '✅ Today' : '—'}</span>
                  )}
                </td>
                <td className="py-3 pr-3 text-muted">🗓 {formatExpiry(student.expiryDate)}</td>
                <td className="py-3 pr-3">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </td>
                <td className="py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="student-action-btn student-action-btn--view"
                      onClick={() => onView(student.id)}
                    >
                      View
                    </button>
                    <button
                      type="button"
                      className="student-action-btn student-action-btn--edit"
                      onClick={() => onEdit(student.id)}
                    >
                      Edit
                    </button>
                    <StudentQuickMenu
                      student={student}
                      onView={() => onView(student.id)}
                      onEdit={() => onEdit(student.id)}
                      onFees={() => onFees(student.id)}
                      onAttendance={() => onAttendance(student.id)}
                      onMessage={() => onMessage(student.id)}
                      onBlock={() => onBlock(student.id)}
                      onDelete={() => onDelete(student.id)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
