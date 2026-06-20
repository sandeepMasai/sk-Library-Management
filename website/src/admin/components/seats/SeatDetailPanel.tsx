import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { seatDisplayNumber, seatMatrixLabel, toneBadgeClass } from '../../utils/seatHelpers';
import { formatExpiry, statusBadge, studentDisplayId } from '../../utils/studentHelpers';

type SeatDetailPanelProps = {
  seat: EnrichedSeat | null;
  presentToday?: boolean;
  rate: number;
  floors: { label: string; pct: number }[];
  expiring: EnrichedSeat[];
  activity: { id: string; label: string; time: string; icon: string }[];
  busy?: boolean;
  reminderBusy?: string | null;
  onClose: () => void;
  onRelease: () => void;
  onChangeSeat: () => void;
  onMessage: (studentId: string) => void;
  onReminder: (studentId: string, seat: EnrichedSeat) => void;
};

function toneLabel(tone: EnrichedSeat['tone']) {
  if (tone === 'occupied') return 'Occupied';
  if (tone === 'reserved') return 'Reserved';
  if (tone === 'maintenance') return 'Maintenance';
  return 'Available';
}

function StudentAvatar({ name, photoUrl }: { name: string; photoUrl?: string | null }) {
  if (photoUrl) {
    return <img src={photoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white" />;
  }
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700 ring-2 ring-white">
      {initials}
    </div>
  );
}

export function SeatDetailPanel({
  seat,
  presentToday,
  rate,
  floors,
  expiring,
  activity,
  busy,
  reminderBusy,
  onClose,
  onRelease,
  onChangeSeat,
  onMessage,
  onReminder,
}: SeatDetailPanelProps) {
  const navigate = useNavigate();

  if (!seat) {
    return (
      <aside className="seat-detail-panel hidden w-full shrink-0 space-y-4 xl:block xl:w-80">
        <div className="admin-card rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-slate-900">Seat details</h3>
          <p className="mt-2 text-sm text-muted">Select a seat from the floor map or table to view student info and actions.</p>
        </div>

        <div className="admin-card rounded-2xl p-5">
          <h3 className="font-display text-sm font-bold text-slate-900">Occupancy</h3>
          <div className="mt-4 flex items-center gap-4">
            <div
              className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#7c3aed ${rate * 3.6}deg, #e2e8f0 0)` }}
            >
              <div className="flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
                <span className="text-base font-bold text-slate-900">{rate}%</span>
              </div>
            </div>
            <p className="text-xs text-muted">Library-wide seat utilization</p>
          </div>
          <div className="mt-4 space-y-2">
            {floors.map((f) => (
              <div key={f.label}>
                <div className="mb-0.5 flex justify-between text-xs">
                  <span className="text-slate-600">{f.label}</span>
                  <span className="font-semibold">{f.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${f.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  const student = seat.student;
  const code = seatMatrixLabel(seat.number);
  const daysLeft = seat.daysToExpiry;

  return (
    <aside className="seat-detail-panel w-full shrink-0 space-y-4 xl:w-80">
      {/* Seat header */}
      <div className="admin-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Seat details</p>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              {code}
              <span className="ml-1 text-base font-normal text-muted">· {seat.floorLabel}</span>
            </h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-slate-100 xl:hidden">
            ✕
          </button>
        </div>
        <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneBadgeClass(seat.tone)}`}>
          {toneLabel(seat.tone)}
        </span>
      </div>

      {/* Student card */}
      {student ? (
        <div className="admin-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <StudentAvatar name={student.name} photoUrl={student.photoUrl} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{student.name}</p>
              <p className="text-xs text-muted">{studentDisplayId(student)}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Phone</dt>
              <dd className="font-medium">{student.mobile}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Plan</dt>
              <dd className="font-medium">{seat.membershipPlan || '—'}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Expiry</dt>
              <dd className="text-right">
                <span className="font-medium">{formatExpiry(student.expiryDate)}</span>
                {daysLeft != null && daysLeft <= 15 && daysLeft >= 0 ? (
                  <span className="ml-1 text-xs font-semibold text-amber-600">
                    ({daysLeft} days left)
                  </span>
                ) : null}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Status</dt>
              <dd>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadge(student).className}`}>
                  {statusBadge(student).label}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted">Attendance</dt>
              <dd className="font-medium">{presentToday ? '🟢 Present' : '⚪ Not marked'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-sm text-muted">
          No student assigned. Use <strong>Assign seat</strong> to allocate this seat.
        </div>
      )}

      {/* Quick actions */}
      <div className="admin-card rounded-2xl p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Quick actions</p>
        <div className="grid grid-cols-2 gap-2">
          {student ? (
            <>
              <Button
                variant="outline"
                className="!px-2 !py-2 text-xs"
                onClick={() => navigate('/admin/students', { state: { openStudentId: student.id } })}
              >
                View student
              </Button>
              <Button variant="outline" className="!px-2 !py-2 text-xs" onClick={onChangeSeat}>
                Change seat
              </Button>
              <Button variant="outline" className="!px-2 !py-2 text-xs" disabled={busy} onClick={onRelease}>
                Release seat
              </Button>
              <Button
                variant="outline"
                className="!px-2 !py-2 text-xs"
                onClick={() => navigate('/admin/students', { state: { openStudentId: student.id } })}
              >
                Renew
              </Button>
              <Button
                variant="outline"
                className="col-span-2 !px-2 !py-2 text-xs"
                onClick={() => onMessage(student.id)}
              >
                Send message
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Analytics mini */}
      <div className="admin-card rounded-2xl p-5">
        <h3 className="text-sm font-bold text-slate-900">Seat analytics</h3>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(#7c3aed ${rate * 3.6}deg, #e2e8f0 0)` }}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-sm font-bold shadow-inner">
              {rate}%
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            {floors.slice(0, 3).map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-xs">
                <span className="w-20 truncate text-muted">{f.label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-violet-500" style={{ width: `${f.pct}%` }} />
                </div>
                <span className="w-8 text-right font-semibold">{f.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expiring */}
      {expiring.length > 0 ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Expiring memberships</h3>
          <ul className="mt-3 space-y-2">
            {expiring.slice(0, 3).map((s) => (
              <li key={s.seatId} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.student?.name}</p>
                  <p className="text-xs text-muted">
                    {seatDisplayNumber(s.number)} · {s.daysToExpiry}d left
                  </p>
                </div>
                <button
                  type="button"
                  disabled={reminderBusy === s.student?.id}
                  onClick={() => s.student && onReminder(s.student.id, s)}
                  className="shrink-0 text-xs font-semibold text-violet-600 hover:underline"
                >
                  Remind
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Activity */}
      {activity.length > 0 ? (
        <div className="admin-card rounded-2xl p-5">
          <h3 className="text-sm font-bold text-slate-900">Recent activity</h3>
          <ol className="mt-3 space-y-2">
            {activity.slice(0, 4).map((item) => (
              <li key={item.id} className="flex gap-2 text-sm">
                <span className="text-base">{item.icon}</span>
                <div>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-muted">{item.time}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </aside>
  );
}
