import type { EnrichedSeat } from '../../utils/seatHelpers';
import { SeatStudentBadge } from './SeatStudentBadge';

type SeatCardGridProps = {
  seats: EnrichedSeat[];
  selectedId?: string | null;
  loading?: boolean;
  onSelect: (seat: EnrichedSeat) => void;
  onAddSeats: () => void;
};

export function SeatCardGrid({ seats, selectedId, loading, onSelect, onAddSeats }: SeatCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="admin-skeleton aspect-[4/3] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      <button
        type="button"
        onClick={onAddSeats}
        className="flex min-h-[6.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/5 p-3 transition hover:border-primary hover:bg-primary/10"
      >
        <span className="text-2xl text-primary">+</span>
        <span className="text-[11px] font-bold text-primary">Add Seats</span>
      </button>

      {seats.map((seat) => {
        const booked = seat.tone === 'occupied';
        const selected = selectedId === seat.seatId;
        const stateLabel = booked ? 'Booked' : selected ? 'Selected' : 'Available';

        return (
          <button
            key={seat.seatId}
            type="button"
            onClick={() => onSelect(seat)}
            className={`flex min-h-[6.5rem] flex-col rounded-2xl border p-2 text-left shadow-sm transition ${
              booked
                ? 'border-white/20 bg-white/12 text-white hover:bg-white/15'
                : selected
                  ? 'border-primary/50 bg-primary/30 text-white shadow-md'
                  : seat.tone === 'disabled'
                    ? 'border-white/10 bg-white/5 text-white/40'
                    : seat.tone === 'reserved'
                      ? 'border-amber-400/35 bg-white/10 text-amber-100 hover:bg-white/15'
                      : 'border-white/15 bg-white/8 text-white/85 hover:bg-white/12'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-bold text-white/70">
              <span>#{seat.number}</span>
              <span>{booked ? '🔒' : selected ? '✓' : '○'}</span>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-1">
              {booked && seat.student ? (
                <SeatStudentBadge
                  name={seat.student.name}
                  photoUrl={seat.student.photoUrl}
                  size="sm"
                />
              ) : (
                <span className="text-center text-[11px] font-bold leading-tight text-white/80">
                  {seat.displayLabel}
                </span>
              )}
            </div>

            <p
              className={`text-center text-[9px] font-bold uppercase tracking-wide ${
                booked ? 'text-white/55' : selected ? 'text-white/90' : 'text-white/50'
              }`}
            >
              {stateLabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}
