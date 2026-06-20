import { GlassCard } from '../../../components/ui/GlassCard';
import { Button } from '../../../components/ui/Button';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { seatDisplayNumber } from '../../utils/seatHelpers';

type SeatAnalyticsPanelProps = {
  rate: number;
  floors: { label: string; pct: number }[];
  loading?: boolean;
};

export function SeatAnalyticsPanel({ rate, floors, loading }: SeatAnalyticsPanelProps) {
  if (loading) {
    return <div className="admin-skeleton h-48 rounded-2xl" />;
  }

  return (
    <GlassCard admin padding="md" className="seat-analytics-card">
      <h3 className="font-display text-sm font-bold text-slate-900">Seat occupancy analytics</h3>
      <p className="mt-1 text-xs text-muted">Floor-wise utilization from current layout</p>

      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:gap-6">
        <div
          className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-primary/20 bg-slate-100"
          style={{
            background: `conic-gradient(#1e5c52 ${rate * 3.6}deg, #e2e8f0 0)`,
          }}
        >
          <div className="flex h-16 w-16 flex-col items-center justify-center rounded-full bg-white text-center shadow-inner">
            <span className="text-lg font-bold text-slate-900">{rate}%</span>
            <span className="text-[9px] uppercase text-muted">Occupancy</span>
          </div>
        </div>

        <div className="w-full flex-1 space-y-3">
          {floors.map((f) => (
            <div key={f.label}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="font-medium text-slate-700">{f.label}</span>
                <span className="font-bold text-slate-900">{f.pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-500 transition-all duration-700"
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

type SeatExpiringAlertsProps = {
  seats: EnrichedSeat[];
  busyId?: string | null;
  onReminder: (studentId: string, seat: EnrichedSeat) => void;
};

export function SeatExpiringAlerts({ seats, busyId, onReminder }: SeatExpiringAlertsProps) {
  if (seats.length === 0) {
    return (
      <GlassCard admin padding="md">
        <h3 className="font-display text-sm font-bold text-slate-900">Expiring seat alerts</h3>
        <p className="mt-2 text-sm text-muted">No memberships expiring in the next 7 days on occupied seats.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard admin padding="md">
      <h3 className="font-display text-sm font-bold text-slate-900">Students with expiring membership</h3>
      <ul className="mt-3 space-y-2">
        {seats.slice(0, 6).map((s) => (
          <li
            key={s.seatId}
            className="flex flex-col gap-2 rounded-xl border border-amber-100 bg-amber-50/60 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-900">
                ⚠ {s.student?.name}
              </p>
              <p className="text-xs text-muted">
                Seat {seatDisplayNumber(s.number)} · Expires in {s.daysToExpiry} day{s.daysToExpiry === 1 ? '' : 's'}
              </p>
            </div>
            <Button
              variant="outline"
              className="!py-1.5 text-xs"
              disabled={busyId === s.student?.id}
              onClick={() => s.student && onReminder(s.student.id, s)}
            >
              Send reminder
            </Button>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}

type SeatActivityPanelProps = {
  items: { id: string; label: string; time: string; icon: string }[];
};

export function SeatActivityPanel({ items }: SeatActivityPanelProps) {
  return (
    <GlassCard admin padding="md">
      <h3 className="font-display text-sm font-bold text-slate-900">Recent activity</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Actions on this page will appear here during your session.</p>
      ) : (
        <ol className="mt-4 space-y-0 border-l-2 border-slate-100 pl-4">
          {items.map((item) => (
            <li key={item.id} className="relative pb-4 last:pb-0">
              <span className="absolute -left-[1.35rem] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs shadow-sm ring-1 ring-slate-100">
                {item.icon}
              </span>
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="text-xs text-muted">{item.time}</p>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  );
}

type SeatWaitingListProps = Record<string, never>;

export function SeatWaitingList(_props: SeatWaitingListProps) {
  return (
    <GlassCard admin padding="md" className="border-dashed">
      <h3 className="font-display text-sm font-bold text-slate-900">Seat waiting list</h3>
      <p className="mt-2 text-sm text-muted">
        When seats are full, add students to a waiting list for auto-assign when a seat opens. This feature uses your
        existing allocation workflow — contact support to enable waiting list tracking.
      </p>
      <div className="mt-3 space-y-2 text-sm text-muted">
        <p>Position #1 — —</p>
        <p>Position #2 — —</p>
        <p>Position #3 — —</p>
      </div>
    </GlassCard>
  );
}
