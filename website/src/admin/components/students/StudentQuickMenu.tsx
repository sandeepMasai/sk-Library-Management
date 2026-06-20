import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { EnrichedStudent } from '../../utils/studentHelpers';
import { formatExpiry, statusBadge } from '../../utils/studentHelpers';

type StudentQuickMenuProps = {
  student: EnrichedStudent;
  onView: () => void;
  onEdit: () => void;
  onMessage: () => void;
  onBlock: () => void;
  onDelete: () => void;
};

export function StudentQuickMenu({
  student,
  onView,
  onEdit,
  onMessage,
  onBlock,
  onDelete,
}: StudentQuickMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const items = [
    { label: 'View profile', action: onView },
    { label: 'Edit student', action: onEdit },
    { label: 'Collect fee', action: onEdit },
    { label: 'Renew membership', action: onEdit },
    { label: 'Assign seat', action: () => window.location.assign('/admin/seats') },
    { label: 'Attendance history', action: onView },
    { label: 'Send message', action: onMessage },
    {
      label: 'Download profile',
      action: () => {
        const blob = new Blob([JSON.stringify(student, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${student.displayId}-profile.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    },
    { label: student.isBlocked ? 'Unblock' : 'Block', action: onBlock },
    { label: 'Delete', action: onDelete, danger: true },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-slate-900"
        aria-label="More actions"
      >
        ⋮
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-xl border border-white/20 bg-emerald-900/95 py-1 shadow-lg backdrop-blur-md">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false);
                item.action();
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                item.danger ? 'text-red-600' : 'text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type StudentMobileListProps = {
  students: EnrichedStudent[];
  onView: (id: string) => void;
};

export function StudentMobileList({ students, onView }: StudentMobileListProps) {
  return (
    <div className="space-y-3 md:hidden">
      {students.map((student) => {
        const badge = statusBadge(student);
        return (
          <div
            key={student.id}
            className="student-mobile-card admin-card rounded-2xl p-4"
          >
            <div className="flex items-start gap-3">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                  👤
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">{student.name}</p>
                <p className="text-sm text-muted">📱 {student.mobile}</p>
                <p className="mt-1 text-xs text-muted">
                  {student.seatNumber ? `💺 Seat ${student.seatNumber}` : 'No seat'} · 📅 {student.membershipPlan}
                </p>
              </div>
              <span className={`shrink-0 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted">
              <span>{student.displayId}</span>
              <span>🗓 {formatExpiry(student.expiryDate)}</span>
            </div>
            <button
              type="button"
              onClick={() => onView(student.id)}
              className="mt-3 w-full rounded-xl bg-primary/10 py-2.5 text-sm font-semibold text-primary"
            >
              View profile
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function StudentBulkBar({
  count,
  onMessage,
  onExport,
  onDelete,
  onClear,
}: {
  count: number;
  onMessage: () => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  if (count === 0) return null;

  return (
    <div className="student-bulk-bar flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
      <p className="text-sm font-semibold text-slate-900">{count} selected</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onMessage} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
          Send message
        </button>
        <Link
          to="/admin/seats"
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
        >
          Assign seat
        </Link>
        <button type="button" onClick={onExport} className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
          Export selected
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600"
        >
          Delete selected
        </button>
        <button type="button" onClick={onClear} className="text-xs text-muted">
          Clear
        </button>
      </div>
    </div>
  );
}
