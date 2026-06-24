import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import type { EnrichedStudent } from '../../utils/studentHelpers';
import { formatExpiry, statusBadge } from '../../utils/studentHelpers';

type StudentQuickMenuProps = {
  student: EnrichedStudent;
  onView: () => void;
  onEdit: () => void;
  onFees: () => void;
  onAttendance: () => void;
  onMessage: () => void;
  onBlock: () => void;
  onDelete: () => void;
};

type MenuItem = {
  label: string;
  action: () => void;
  danger?: boolean;
  icon?: string;
};

type MenuPosition = { top: number; left: number };

const MENU_WIDTH = 224;

function computeMenuPosition(anchor: HTMLElement): MenuPosition {
  const rect = anchor.getBoundingClientRect();
  const estimatedHeight = 360;
  const gap = 8;
  let top = rect.bottom + gap;
  if (top + estimatedHeight > window.innerHeight - 8) {
    top = Math.max(8, rect.top - estimatedHeight - gap);
  }
  const left = Math.min(
    Math.max(8, rect.right - MENU_WIDTH),
    window.innerWidth - MENU_WIDTH - 8
  );
  return { top, left };
}

export function StudentQuickMenu({
  student,
  onView,
  onEdit,
  onFees,
  onAttendance,
  onMessage,
  onBlock,
  onDelete,
}: StudentQuickMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const update = () => {
      if (!anchorRef.current) return;
      setPosition(computeMenuPosition(anchorRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const items: MenuItem[] = [
    { label: 'View profile', action: onView, icon: '👤' },
    { label: 'Edit student', action: onEdit, icon: '✏️' },
    { label: 'Collect fee', action: onFees, icon: '💰' },
    { label: 'Renew membership', action: onEdit, icon: '🔄' },
    { label: 'Assign seat', action: () => window.location.assign('/admin/seats'), icon: '💺' },
    { label: 'Attendance history', action: onAttendance, icon: '📊' },
    { label: 'Send message', action: onMessage, icon: '💬' },
    {
      label: 'Download profile',
      icon: '⬇️',
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
    { label: student.isBlocked ? 'Unblock' : 'Block', action: onBlock, icon: student.isBlocked ? '✅' : '🚫' },
    { label: 'Delete', action: onDelete, danger: true, icon: '🗑️' },
  ];

  const menu =
    open && position
      ? createPortal(
          <>
            <div className="student-quick-menu-backdrop fixed inset-0 z-[190]" aria-hidden onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              className="student-quick-menu-panel admin-card fixed z-[200] overflow-hidden rounded-2xl border border-white/15 shadow-2xl"
              style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
              role="menu"
              aria-label="Student actions"
            >
              <div className="border-b border-white/10 px-3 py-2.5">
                <p className="truncate text-sm font-semibold text-white">{student.name}</p>
                <p className="truncate text-xs text-white/60">@{student.username}</p>
              </div>
              <div className="max-h-[min(24rem,calc(100dvh-6rem))] overflow-y-auto py-1">
                {items.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      item.action();
                    }}
                    className={`student-quick-menu-item flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                      item.danger ? 'text-rose-300 hover:bg-rose-500/15' : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base leading-none" aria-hidden>
                      {item.icon}
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`student-action-btn student-action-btn--menu ${open ? 'student-action-btn--active' : ''}`}
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        ⋮
      </button>
      {menu}
    </>
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
          <div key={student.id} className="student-mobile-card admin-card rounded-2xl p-4">
            <div className="flex items-start gap-3">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
                  👤
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{student.name}</p>
                <p className="text-sm text-muted">📱 {student.mobile}</p>
                <p className="mt-1 text-xs text-muted">
                  {student.seatNumber ? `💺 Seat ${student.seatNumber}` : 'No seat'} · 📅 {student.membershipPlan}
                </p>
              </div>
              <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
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
              className="student-action-btn student-action-btn--view mt-3 w-full"
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
      <p className="text-sm font-semibold text-white">{count} selected</p>
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
          className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-200"
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
