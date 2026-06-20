import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { seatDisplayNumber } from '../../utils/seatHelpers';

type SeatChangeModalProps = {
  open: boolean;
  seat: EnrichedSeat | null;
  seats: EnrichedSeat[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (fromSeatId: string, toSeatId: string) => void;
};

export function SeatChangeModal({ open, seat, seats, busy, onClose, onConfirm }: SeatChangeModalProps) {
  const [toSeatId, setToSeatId] = useState('');

  const availableSeats = useMemo(
    () => seats.filter((s) => s.tone === 'available' && s.seatId !== seat?.seatId),
    [seats, seat]
  );

  const target = seats.find((s) => s.seatId === toSeatId);

  if (!open || !seat?.student) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <GlassCard admin padding="md" className="w-full max-w-md animate-slide-down">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Change seat</p>
            <h3 className="font-display text-xl font-bold text-slate-900">Move student</h3>
          </div>
          <button type="button" className="text-muted" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <p className="text-xs text-muted">Current seat</p>
              <p className="font-bold text-slate-900">{seatDisplayNumber(seat.number)}</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted">New seat</p>
              <p className="font-bold text-primary">
                {target ? seatDisplayNumber(target.number) : 'Select below'}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-slate-700">Available seats</p>
            <div className="grid max-h-40 grid-cols-5 gap-2 overflow-y-auto">
              {availableSeats.map((s) => (
                <button
                  key={s.seatId}
                  type="button"
                  onClick={() => setToSeatId(s.seatId)}
                  className={`rounded-lg border py-2 text-xs font-bold ${
                    toSeatId === s.seatId
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {seatDisplayNumber(s.number)}
                </button>
              ))}
            </div>
          </div>

          {toSeatId ? (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
              Move <strong>{seat.student.name}</strong> from{' '}
              <strong>{seatDisplayNumber(seat.number)}</strong> to{' '}
              <strong>{target ? seatDisplayNumber(target.number) : '—'}</strong>?
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={busy || !toSeatId}
              onClick={() => onConfirm(seat.seatId, toSeatId)}
            >
              {busy ? 'Moving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
