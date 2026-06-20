import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import type { StudentRow } from '../../api/libraryApi';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import { getStudentStatus } from '../../utils/studentHelpers';

type SeatAllocationModalProps = {
  open: boolean;
  seat: EnrichedSeat | null;
  shiftName?: string;
  students: StudentRow[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (studentId: string, startDate: string, endDate: string) => void;
};

export function SeatAllocationModal({
  open,
  seat,
  shiftName,
  students,
  busy,
  onClose,
  onConfirm,
}: SeatAllocationModalProps) {
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => getStudentStatus(s) === 'active')
      .filter((s) => {
        if (!q) return true;
        return s.name.toLowerCase().includes(q) || s.mobile.includes(q) || s.username.toLowerCase().includes(q);
      });
  }, [students, query]);

  if (!open || !seat) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <GlassCard admin padding="md" className="max-h-[90vh] w-full max-w-lg overflow-y-auto animate-slide-down">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Assign seat</p>
            <h3 className="font-display text-xl font-bold text-slate-900">
              Seat #{seat.number} {shiftName ? `· ${shiftName}` : ''}
            </h3>
          </div>
          <button type="button" className="text-muted" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="relative mb-3">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student name, phone…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted">No active students found.</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStudentId(s.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                  studentId === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted">{s.mobile}</span>
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={busy || !studentId}
            onClick={() => onConfirm(studentId, `${startDate}T00:00:00.000Z`, `${endDate}T23:59:59.000Z`)}
          >
            {busy ? 'Assigning…' : 'Assign seat'}
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}
