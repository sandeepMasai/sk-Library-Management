import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';

type SeatAddModalProps = {
  open: boolean;
  currentTotal: number;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (total: number) => void;
};

export function SeatAddModal({ open, currentTotal, busy, onClose, onSubmit }: SeatAddModalProps) {
  const [total, setTotal] = useState(String(currentTotal || 50));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <GlassCard admin padding="md" className="w-full max-w-md animate-slide-down">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">Seat capacity</p>
            <h3 className="font-display text-xl font-bold text-slate-900">Add / set seats</h3>
          </div>
          <button type="button" className="text-muted" onClick={onClose}>
            ✕
          </button>
        </div>
        <p className="mb-4 text-sm text-muted">
          Set total seat count for your library (1–5000). Existing assignments are preserved when increasing capacity.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(Number(total));
          }}
          className="space-y-4"
        >
          <Input
            label="Total seats"
            type="number"
            min={1}
            max={5000}
            value={total}
            onChange={(e) => setTotal(e.target.value)}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={busy}>
              {busy ? 'Saving…' : 'Save capacity'}
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
