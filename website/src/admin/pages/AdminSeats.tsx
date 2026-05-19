import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { fetchSeats, setTotalSeats, type SeatRow } from '../api/libraryApi';

export function AdminSeats() {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [total, setTotal] = useState('50');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchSeats()
      .then(setSeats)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function applyTotal(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await setTotalSeats(Number(total));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  const assigned = seats.filter((s) => s.status === 'occupied' || s.studentId).length;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Seats</h1>
      <p className="mt-1 text-sm text-muted">
        {seats.length} seats · {assigned} assigned
      </p>

      <form onSubmit={applyTotal} className="mt-6 flex max-w-md flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-6">
        <Input label="Set total seats (1–5000)" type="number" min={1} max={5000} value={total} onChange={(e) => setTotal(e.target.value)} />
        <Button type="submit" disabled={saving}>
          {saving ? 'Updating…' : 'Apply'}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
        {loading ? (
          <p className="col-span-full text-muted">Loading…</p>
        ) : (
          seats.map((seat) => (
            <div
              key={seat._id}
              className={`flex h-12 items-center justify-center rounded-lg border text-sm font-semibold ${
                seat.studentId || seat.status === 'occupied'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
              title={`Seat ${seat.number}`}
            >
              {seat.number}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
