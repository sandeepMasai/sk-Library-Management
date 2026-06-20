import { Button } from '../../../components/ui/Button';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { formatExpiry } from '../../utils/studentHelpers';
import { seatDisplayNumber, toneClasses } from '../../utils/seatHelpers';

type SeatBulkBarProps = {
  count: number;
  busy?: boolean;
  onClear: () => void;
  onRelease: () => void;
  onExport: () => void;
  onMessage: () => void;
};

export function SeatBulkBar({ count, busy, onClear, onRelease, onExport, onMessage }: SeatBulkBarProps) {
  if (count === 0) return null;

  return (
    <div className="seat-bulk-bar admin-card fixed bottom-20 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3 shadow-xl backdrop-blur-md sm:bottom-6 sm:left-auto sm:right-8 sm:max-w-xl">
      <p className="text-sm font-semibold text-slate-900">{count} seat{count === 1 ? '' : 's'} selected</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="!py-1.5 text-xs" disabled={busy} onClick={onRelease}>
          Release seats
        </Button>
        <Button variant="outline" className="!py-1.5 text-xs" onClick={onExport}>
          Export data
        </Button>
        <Button variant="outline" className="!py-1.5 text-xs" onClick={onMessage}>
          Send messages
        </Button>
        <Button variant="ghost" className="!py-1.5 text-xs" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}

type SeatMobileListProps = {
  seats: EnrichedSeat[];
  loading?: boolean;
  onSelect: (seat: EnrichedSeat) => void;
};

export function SeatMobileList({ seats, loading, onSelect }: SeatMobileListProps) {
  if (loading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-24 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 md:hidden">
      {seats.map((seat) => (
        <article
          key={seat.seatId}
          className="seat-mobile-card admin-card rounded-2xl p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-slate-900">💺 {seatDisplayNumber(seat.number)}</p>
              <p className="text-sm text-white/90">{seat.student ? `👤 ${seat.student.name}` : 'Unassigned'}</p>
              <p className="mt-1 text-xs font-medium">
                {seat.tone === 'occupied' ? '👤 Occupied' : seat.tone === 'reserved' ? '🟨 Reserved' : '○ Available'}
              </p>
              {seat.student?.expiryDate ? (
                <p className="mt-1 text-xs text-muted">📅 Expiry: {formatExpiry(seat.student.expiryDate)}</p>
              ) : null}
            </div>
            <span className={`rounded-lg border px-2 py-1 text-[10px] font-bold ${toneClasses(seat.tone)}`}>
              #{seat.number}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(seat)}
            className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-primary hover:bg-slate-50"
          >
            View details
          </button>
        </article>
      ))}
    </div>
  );
}
