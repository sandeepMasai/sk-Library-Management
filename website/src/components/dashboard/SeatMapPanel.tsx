import { Link } from 'react-router-dom';
import type { SeatRow } from '../../admin/api/libraryApi';

type SeatMapPanelProps = {
  seats: SeatRow[];
  loading?: boolean;
  dark?: boolean;
};

export function SeatMapPanel({ seats, loading, dark = false }: SeatMapPanelProps) {
  const occupied = seats.filter((s) => s.studentId || s.status === 'occupied').length;
  const total = seats.length;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        dark ? 'glass-panel-dark border-white/10' : 'border-slate-200/80 bg-white shadow-sm'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className={`font-display text-lg font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
            Real-Time Seat Map
          </h2>
          <p className={`mt-0.5 text-sm ${dark ? 'text-slate-400' : 'text-muted'}`}>
            {occupied} occupied · {total - occupied} available
          </p>
        </div>
        <Link
          to="/admin/seats"
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            dark
              ? 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25'
              : 'bg-primary/10 text-primary hover:bg-primary/15'
          }`}
        >
          Manage seats
        </Link>
      </div>

      <div
        className={`mt-5 min-h-[220px] rounded-xl border p-4 sm:min-h-[280px] ${
          dark ? 'border-white/10 bg-black/20' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        {loading ? (
          <p className={`py-16 text-center text-sm ${dark ? 'text-slate-500' : 'text-muted'}`}>Loading seat map…</p>
        ) : seats.length === 0 ? (
          <p className={`py-16 text-center text-sm ${dark ? 'text-slate-500' : 'text-muted'}`}>
            No seats configured yet.{' '}
            <Link to="/admin/seats" className="font-semibold text-primary underline">
              Set total seats
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
            {seats.map((seat, i) => {
              const isOccupied = Boolean(seat.studentId || seat.status === 'occupied');
              return (
                <div
                  key={seat._id}
                  title={`Seat ${seat.number}${isOccupied ? ' · occupied' : ' · available'}`}
                  className={`animate-seat flex aspect-square items-center justify-center rounded-lg border text-[10px] font-bold sm:text-xs ${
                    isOccupied
                      ? dark
                        ? 'border-cyan-400/50 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                        : 'border-primary/40 bg-primary/15 text-primary shadow-sm'
                      : dark
                        ? 'border-white/10 bg-white/5 text-slate-500'
                        : 'border-slate-200 bg-white text-slate-400'
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
        <span className={`flex items-center gap-2 ${dark ? 'text-slate-400' : 'text-muted'}`}>
          <span className={`h-3 w-3 rounded ${dark ? 'bg-cyan-500/40' : 'bg-primary/30'}`} /> Occupied
        </span>
        <span className={`flex items-center gap-2 ${dark ? 'text-slate-400' : 'text-muted'}`}>
          <span className={`h-3 w-3 rounded border ${dark ? 'border-white/20 bg-white/5' : 'border-slate-200 bg-white'}`} />{' '}
          Available
        </span>
      </div>
    </div>
  );
}
