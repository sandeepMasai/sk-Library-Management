import { Link } from 'react-router-dom';
import type { AllocationRow, SeatRow } from '../../admin/api/libraryApi';
import { buildAllocationMap, normalizeSeatId } from '../../admin/utils/seatHelpers';
import { formatDisplayName } from '../../utils/formatName';

type SeatMapPanelProps = {
  seats: SeatRow[];
  allocations?: AllocationRow[];
  shiftName?: string | null;
  loading?: boolean;
  dark?: boolean;
  admin?: boolean;
};

export function SeatMapPanel({
  seats,
  allocations = [],
  shiftName,
  loading,
  dark = false,
  admin = false,
}: SeatMapPanelProps) {
  const isDark = dark || admin;
  const allocationBySeat = buildAllocationMap(allocations);
  const sortedSeats = [...seats].sort((a, b) => a.number - b.number);

  const occupiedCount = sortedSeats.reduce((count, seat) => {
    const seatId = normalizeSeatId(seat);
    const alloc = allocationBySeat.get(seatId);
    const isOccupied = Boolean(alloc || seat.studentId || seat.status === 'occupied');
    return count + (isOccupied ? 1 : 0);
  }, 0);

  const total = sortedSeats.length;

  return (
    <div
      className={
        admin
          ? 'admin-card admin-panel rounded-2xl p-5 sm:p-6'
          : `rounded-2xl border p-5 sm:p-6 ${
              isDark ? 'glass-panel-dark border-white/10' : 'border-slate-200/80 bg-white shadow-sm'
            }`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`font-display text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Real-Time Seat Map
          </h2>
          <p className={`mt-0.5 text-sm ${isDark ? 'text-white/70' : 'text-muted'}`}>
            {occupiedCount} occupied · {total - occupiedCount} available
            {shiftName ? ` · ${shiftName}` : allocations.length ? ' · all shifts' : ''}
          </p>
        </div>
        <Link
          to="/admin/seats"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            admin
              ? 'border border-white/20 bg-white/10 text-white hover:bg-white/15'
              : isDark
                ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
                : 'bg-primary/10 text-primary hover:bg-primary/15'
          }`}
        >
          Manage seats
        </Link>
      </div>

      <div
        className={`mt-5 min-h-[220px] rounded-xl border p-4 sm:min-h-[280px] ${
          admin
            ? 'border-white/15 bg-white/8'
            : isDark
              ? 'border-white/10 bg-black/20'
              : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        {loading ? (
          <p className={`py-16 text-center text-sm ${isDark ? 'text-white/60' : 'text-muted'}`}>Loading seat map…</p>
        ) : sortedSeats.length === 0 ? (
          <p className={`py-16 text-center text-sm ${isDark ? 'text-white/60' : 'text-muted'}`}>
            No seats configured yet.{' '}
            <Link to="/admin/seats" className="font-semibold text-primary underline">
              Set total seats
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
            {sortedSeats.map((seat, i) => {
              const seatId = normalizeSeatId(seat);
              const alloc = allocationBySeat.get(seatId);
              const studentName = alloc?.student?.name
                ? formatDisplayName(alloc.student.name)
                : null;
              const isOccupied = Boolean(alloc || seat.studentId || seat.status === 'occupied');
              const title = studentName
                ? `Seat ${seat.number} · ${studentName}`
                : `Seat ${seat.number}${isOccupied ? ' · occupied' : ' · available'}`;

              return (
                <div
                  key={seatId || `seat-${seat.number}`}
                  title={title}
                  className={`animate-seat flex aspect-square items-center justify-center rounded-lg border text-[10px] font-bold sm:text-xs ${
                    isOccupied
                      ? 'border-emerald-400/60 bg-emerald-500/25 text-emerald-100 shadow-sm shadow-emerald-500/20'
                      : 'border-rose-400/55 bg-rose-500/20 text-rose-100 shadow-sm shadow-rose-500/15'
                  }`}
                  style={{ animationDelay: `${Math.min(i * 18, 400)}ms` }}
                >
                  {seat.number}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <span className={`flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-muted'}`}>
          <span className="h-3 w-3 rounded border border-emerald-400/60 bg-emerald-500/40" /> Occupied
        </span>
        <span className={`flex items-center gap-2 ${isDark ? 'text-white/70' : 'text-muted'}`}>
          <span className="h-3 w-3 rounded border border-rose-400/55 bg-rose-500/35" /> Available
        </span>
      </div>
    </div>
  );
}
