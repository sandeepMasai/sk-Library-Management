import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { seatMatrixLabel, toneBadgeClass } from '../../utils/seatHelpers';
import { formatExpiry, statusBadge, studentDisplayId } from '../../utils/studentHelpers';
import { SeatStudentBadge, studentNameColor } from './SeatStudentBadge';

const PAGE_SIZE = 10;

type SeatTableProps = {
  seats: EnrichedSeat[];
  selectedId?: string | null;
  selectedIds: Set<string>;
  loading?: boolean;
  onSelect: (seat: EnrichedSeat) => void;
  onToggle: (seatId: string) => void;
  onSelectPage: (seatIds: string[], selected: boolean) => void;
};

function StudentCell({ seat }: { seat: EnrichedSeat }) {
  if (!seat.student) return <span className="text-muted">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      <SeatStudentBadge name={seat.student.name} photoUrl={seat.student.photoUrl} size="sm" showName={false} />
      <div className="min-w-0">
        <p className={`truncate font-medium ${studentNameColor(seat.student.name).name}`}>{seat.student.name}</p>
        <p className="text-xs text-muted">{studentDisplayId(seat.student)}</p>
      </div>
    </div>
  );
}

export function SeatTable({
  seats,
  selectedId,
  selectedIds,
  loading,
  onSelect,
  onToggle,
  onSelectPage,
}: SeatTableProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(seats.length / PAGE_SIZE));

  const pageSeats = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return seats.slice(start, start + PAGE_SIZE);
  }, [seats, page]);

  useEffect(() => {
    setPage(1);
  }, [seats.length, seats[0]?.seatId, seats[seats.length - 1]?.seatId]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  if (loading) {
    return <div className="admin-skeleton h-64 rounded-2xl" />;
  }

  const pageIds = pageSeats.map((s) => s.seatId);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  return (
    <div className="seat-table-wrap admin-card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">Student & seat table</h3>
        {seats.length > 0 ? (
          <p className="text-xs text-muted">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, seats.length)} of {seats.length}
          </p>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => onSelectPage(pageIds, !allPageSelected)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
              </th>
              <th className="px-4 py-3">Seat</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {pageSeats.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-muted">
                  No seats match your filters.
                </td>
              </tr>
            ) : (
              pageSeats.map((seat) => {
                const isActive = selectedId === seat.seatId;
                return (
                  <tr
                    key={seat.seatId}
                    onClick={() => onSelect(seat)}
                    className={`seat-table-row cursor-pointer transition ${isActive ? 'bg-violet-50/80' : 'hover:bg-slate-50/80'
                      }`}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(seat.seatId)}
                        onChange={() => onToggle(seat.seatId)}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${toneBadgeClass(seat.tone)}`}
                      >
                        {seatMatrixLabel(seat.number)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StudentCell seat={seat} />
                    </td>
                    <td className="px-4 py-3 text-muted">{seat.student?.mobile || '—'}</td>
                    <td className="px-4 py-3">{seat.membershipPlan || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneBadgeClass(seat.tone)}`}>
                        {seat.tone === 'occupied' ? 'Occupied' : seat.tone === 'reserved' ? 'Reserved' : 'Available'}
                      </span>
                      {seat.student ? (
                        <span
                          className={`ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadge(seat.student).className}`}
                        >
                          {statusBadge(seat.student).label}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatExpiry(seat.student?.expiryDate)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => onSelect(seat)}>
                        ···
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 border-t border-slate-100 px-4 py-3">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
