import { useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import type { EnrichedSeat } from '../../utils/seatHelpers';
import type { StudentRow } from '../../api/libraryApi';
import { getStudentStatus } from '../../utils/studentHelpers';
import { seatDisplayNumber } from '../../utils/seatHelpers';

type SeatAssignModalProps = {
  open: boolean;
  students: StudentRow[];
  seats: EnrichedSeat[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (studentId: string, seatId: string) => void;
};

export function SeatAssignModal({ open, students, seats, busy, onClose, onConfirm }: SeatAssignModalProps) {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState('');
  const [studentId, setStudentId] = useState('');
  const [seatId, setSeatId] = useState('');

  const availableSeats = useMemo(
    () => seats.filter((s) => s.tone === 'available'),
    [seats]
  );

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students
      .filter((s) => getStudentStatus(s) === 'active')
      .filter((s) => {
        if (!q) return true;
        return (
          s.name.toLowerCase().includes(q) ||
          s.mobile.includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.username || '').toLowerCase().includes(q)
        );
      });
  }, [students, query]);

  const selectedStudent = students.find((s) => s.id === studentId);
  const selectedSeat = seats.find((s) => s.seatId === seatId);

  if (!open) return null;

  function reset() {
    setStep(1);
    setQuery('');
    setStudentId('');
    setSeatId('');
  }

  function close() {
    reset();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <GlassCard admin padding="md" className="w-full max-w-lg animate-slide-down">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Quick assign seat</p>
            <h3 className="font-display text-xl font-bold text-slate-900">Assign seat</h3>
          </div>
          <button type="button" className="text-muted" onClick={close}>
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 flex-1 rounded-full ${step >= n ? 'bg-primary' : 'bg-slate-200'}`}
            />
          ))}
        </div>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Step 1 — Search student</p>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, phone, student ID"
                className="focus-ring-brand w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
              />
            </div>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-2">
              {filteredStudents.length === 0 ? (
                <p className="p-3 text-sm text-muted">No active students found.</p>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStudentId(s.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${studentId === s.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'
                      }`}
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-muted">{s.mobile}</span>
                  </button>
                ))
              )}
            </div>
            <Button className="w-full" disabled={!studentId} onClick={() => setStep(2)}>
              Continue
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Step 2 — Choose seat (available only)</p>
            <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-6">
              {availableSeats.map((s) => (
                <button
                  key={s.seatId}
                  type="button"
                  onClick={() => setSeatId(s.seatId)}
                  className={`rounded-xl border py-2 text-xs font-bold transition ${seatId === s.seatId
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:scale-105'
                    }`}
                >
                  {seatDisplayNumber(s.number)}
                </button>
              ))}
            </div>
            {availableSeats.length === 0 ? (
              <p className="text-sm text-amber-700">No available seats. Add capacity or release a seat first.</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button className="flex-1" disabled={!seatId} onClick={() => setStep(3)}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-4">
            <p className="text-sm font-medium text-slate-700">Step 3 — Confirm</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm">
              <p>
                Assign <strong>{selectedStudent?.name}</strong> to seat{' '}
                <strong>{selectedSeat ? seatDisplayNumber(selectedSeat.number) : '—'}</strong>?
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={busy || !studentId || !seatId}
                onClick={() => {
                  onConfirm(studentId, seatId);
                  reset();
                }}
              >
                {busy ? 'Assigning…' : 'Assign seat'}
              </Button>
            </div>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}
