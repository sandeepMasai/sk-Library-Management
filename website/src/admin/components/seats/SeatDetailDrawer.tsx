import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { formatExpiry, statusBadge } from '../../utils/studentHelpers';
import { seatDisplayNumber } from '../../utils/seatHelpers';

type SeatDetailDrawerProps = {
  seat: EnrichedSeat | null;
  presentToday?: boolean;
  busy?: boolean;
  onClose: () => void;
  onRelease: () => void;
  onChangeSeat: () => void;
};

function toneLabel(tone: EnrichedSeat['tone']) {
  if (tone === 'occupied') return '🟥 Occupied';
  if (tone === 'reserved') return '🟨 Reserved';
  if (tone === 'maintenance') return '⚙ Maintenance';
  return '🟩 Available';
}

export function SeatDetailDrawer({
  seat,
  presentToday,
  busy,
  onClose,
  onRelease,
  onChangeSeat,
}: SeatDetailDrawerProps) {
  const navigate = useNavigate();
  if (!seat) return null;

  const student = seat.student;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <button type="button" className="flex-1" aria-label="Close drawer" onClick={onClose} />
      <aside className="seat-drawer admin-card flex h-full w-full max-w-md flex-col animate-slide-down">
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seat details</p>
            <h2 className="font-display text-2xl font-bold text-slate-900">{seatDisplayNumber(seat.number)}</h2>
            <p className="text-sm text-muted">Seat #{seat.number} · {seat.floorLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <GlassCard admin padding="md" className="!shadow-none">
            <dl className="grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd className="font-semibold">{toneLabel(seat.tone)}</dd>
              </div>
              {student ? (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Student name</dt>
                    <dd className="text-right font-semibold text-slate-900">{student.name}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Phone number</dt>
                    <dd className="font-medium">{student.mobile}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Membership</dt>
                    <dd className="font-medium">{seat.membershipPlan || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Expiry date</dt>
                    <dd className="font-medium">{formatExpiry(student.expiryDate)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Membership status</dt>
                    <dd>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(student).className}`}>
                        {statusBadge(student).label}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Attendance today</dt>
                    <dd className="font-semibold">{presentToday ? '🟢 Present' : '⚪ Not marked'}</dd>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted">No student assigned to this seat.</p>
              )}
            </dl>
          </GlassCard>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Quick actions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {student ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate('/admin/students', { state: { openStudentId: student.id } })
                    }
                  >
                    View student
                  </Button>
                  <Button variant="outline" onClick={onChangeSeat}>
                    Change seat
                  </Button>
                  <Button variant="outline" disabled={busy} onClick={onRelease}>
                    Release seat
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate('/admin/students', { state: { openStudentId: student.id } })
                    }
                  >
                    Renew membership
                  </Button>
                </>
              ) : (
                <Button onClick={onClose}>Assign from toolbar</Button>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
