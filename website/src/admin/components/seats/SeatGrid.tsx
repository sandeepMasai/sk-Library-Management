import type { EnrichedSeat } from '../../utils/seatHelpers';
import {
  SEAT_GRID_COLS,
  buildFloorMatrix,
  groupByFloor,
  seatMatrixLabel,
  toneClasses,
} from '../../utils/seatHelpers';
import { SeatStudentBadge } from './SeatStudentBadge';

type SeatGridProps = {
  seats: EnrichedSeat[];
  activeFloor: string;
  floorOptions: string[];
  selectedId?: string | null;
  selectedIds?: Set<string>;
  bulkMode?: boolean;
  loading?: boolean;
  onFloorChange: (floor: string) => void;
  onSelect: (seat: EnrichedSeat) => void;
  onToggleBulk?: (seatId: string) => void;
};

export function SeatGrid({
  seats,
  activeFloor,
  floorOptions,
  selectedId,
  selectedIds,
  bulkMode,
  loading,
  onFloorChange,
  onSelect,
  onToggleBulk,
}: SeatGridProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-skeleton h-10 w-full max-w-md rounded-xl" />
        <div className="admin-skeleton h-56 rounded-2xl" />
      </div>
    );
  }

  const floors = groupByFloor(seats);
  const currentFloor = floors.find(([f]) => f === activeFloor)?.[1] ?? floors[0]?.[1] ?? [];
  const matrixRows = buildFloorMatrix(currentFloor);
  const colHeaders = Array.from({ length: SEAT_GRID_COLS }, (_, i) =>
    String(i + 1).padStart(2, '0')
  );

  return (
    <div className="seat-floor-map">
      {/* Floor tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {floorOptions.map((floor) => (
          <button
            key={floor}
            type="button"
            onClick={() => onFloorChange(floor)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeFloor === floor
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-200'
              : 'border border-white/20 bg-white/10 text-white/80 hover:border-violet-200/50 hover:text-white'
              }`}
          >
            {floor}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap items-center gap-4 admin-card rounded-xl px-4 py-2.5 text-xs font-medium text-white/80">
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md border border-white/15 bg-white/8" /> Available
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md border border-white/20 bg-white/12" /> Occupied
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-md border border-amber-400/35 bg-white/10" /> Reserved
        </span>
        <span className="ml-auto text-muted">Tap a seat for details</span>
      </div>

      {/* Matrix grid */}
      <div className="admin-card overflow-x-auto rounded-2xl p-4">
        <div className="inline-block min-w-full">
          {/* Column headers */}
          <div
            className="mb-1 grid gap-1"
            style={{ gridTemplateColumns: `2rem repeat(${SEAT_GRID_COLS}, minmax(2rem, 1fr))` }}
          >
            <div />
            {colHeaders.map((h) => (
              <div key={h} className="text-center text-[10px] font-semibold text-muted">
                {h}
              </div>
            ))}
          </div>

          {matrixRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">No seats on this floor.</p>
          ) : (
            matrixRows.map((row, rowIdx) => {
              const rowLetter = String.fromCharCode(65 + rowIdx);
              return (
                <div
                  key={rowLetter}
                  className="mb-1 grid gap-1"
                  style={{ gridTemplateColumns: `2rem repeat(${SEAT_GRID_COLS}, minmax(2rem, 1fr))` }}
                >
                  <div className="flex items-center justify-center text-xs font-bold text-slate-500">
                    {rowLetter}
                  </div>
                  {Array.from({ length: SEAT_GRID_COLS }).map((_, colIdx) => {
                    const seat = row[colIdx];
                    if (!seat) {
                      return <div key={`${rowLetter}-empty-${colIdx}`} className="aspect-square" />;
                    }
                    const isSelected = selectedId === seat.seatId;
                    const isBulk = selectedIds?.has(seat.seatId);
                    const label = seatMatrixLabel(seat.number);
                    return (
                      <button
                        key={seat.seatId}
                        type="button"
                        onClick={() => {
                          if (bulkMode && onToggleBulk) onToggleBulk(seat.seatId);
                          else onSelect(seat);
                        }}
                        title={
                          seat.student
                            ? `${label} — ${seat.student.name}`
                            : `${label} — Available`
                        }
                        className={`seat-matrix-cell flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border p-0.5 transition ${toneClasses(seat.tone, isSelected || isBulk)}`}
                      >
                        {seat.student ? (
                          <>
                            <SeatStudentBadge
                              name={seat.student.name}
                              photoUrl={seat.student.photoUrl}
                              size="xs"
                              showName={false}
                            />
                            <span className="w-full truncate text-center text-[7px] font-semibold leading-none text-white/80">
                              {label.replace(/^[A-Z]/, '')}
                            </span>
                          </>
                        ) : (
                          <span className="text-[9px] font-bold sm:text-[10px]">
                            {label.replace(/^[A-Z]/, '')}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
