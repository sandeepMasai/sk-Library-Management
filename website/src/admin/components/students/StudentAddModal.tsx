import { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import { createStudent, fetchStudents, type StudentRow } from '../../api/libraryApi';
import { studentAddDefaultsFromList } from '../../utils/studentHelpers';

const MEMBERSHIP_DAYS = [30, 90, 180, 365] as const;
const FEE_STATUSES = ['Paid', 'Half Paid', 'Pending'] as const;

type StudentAddModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (student?: StudentRow) => void;
};

export function StudentAddModal({ open, onClose, onCreated }: StudentAddModalProps) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [feeAmount, setFeeAmount] = useState('500');
  const [feeStatus, setFeeStatus] = useState<(typeof FEE_STATUSES)[number]>('Paid');
  const [feeMethod, setFeeMethod] = useState<'cash' | 'upi'>('cash');
  const [membershipDays, setMembershipDays] = useState<(typeof MEMBERSHIP_DAYS)[number]>(30);
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoadingDefaults(true);
    setError('');
    setJoinDate(new Date().toISOString().slice(0, 10));

    fetchStudents()
      .then((rows) => {
        if (!alive) return;
        const defaults = studentAddDefaultsFromList(rows);
        setFeeAmount(String(defaults.feeAmount));
        setFeeStatus(defaults.feeStatus);
        setMembershipDays(defaults.membershipDays);
        setFeeMethod(defaults.feeMethod);
      })
      .catch(() => { })
      .finally(() => {
        if (alive) setLoadingDefaults(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  function resetForm() {
    setName('');
    setMobile('');
    setUsername('');
    setPin('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const joinIso =
        joinDate === todayStr ? new Date().toISOString() : new Date(`${joinDate}T12:00:00`).toISOString();

      const created = await createStudent({
        name: name.trim(),
        mobile: mobile.replace(/\D/g, '').slice(-10),
        username: username.trim().toLowerCase(),
        pin,
        feeAmount: Number(feeAmount) || 0,
        feeStatus,
        feeMethod,
        membershipDays,
        joinDate: joinIso,
      });
      resetForm();
      onCreated(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
      <GlassCard admin padding="md" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">New student</p>
            <h2 className="font-display text-xl font-bold text-slate-900">Add student</h2>
            {loadingDefaults ? (
              <p className="mt-1 text-xs text-muted">Loading fee defaults from your library…</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Fee defaults loaded from your existing students.</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-muted">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <Input label="Full name *" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Mobile *" required value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input label="Username *" required value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input
            label="PIN (4 digits) *"
            required
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          />
          <Input label="Join date *" type="date" required value={joinDate} onChange={(e) => setJoinDate(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Membership</label>
            <select
              value={membershipDays}
              disabled={loadingDefaults}
              onChange={(e) => setMembershipDays(Number(e.target.value) as (typeof MEMBERSHIP_DAYS)[number])}
              className="focus-ring-brand w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
            >
              {MEMBERSHIP_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Fee amount (₹)"
            type="number"
            value={feeAmount}
            disabled={loadingDefaults}
            onChange={(e) => setFeeAmount(e.target.value)}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Fee status</label>
            <select
              value={feeStatus}
              disabled={loadingDefaults}
              onChange={(e) => setFeeStatus(e.target.value as (typeof FEE_STATUSES)[number])}
              className="focus-ring-brand w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
            >
              {FEE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Payment method</label>
            <select
              value={feeMethod}
              disabled={loadingDefaults}
              onChange={(e) => setFeeMethod(e.target.value as 'cash' | 'upi')}
              className="focus-ring-brand w-full rounded-xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
            </select>
          </div>
          {error ? <p className="text-sm text-red-600 sm:col-span-2">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={saving || loadingDefaults} className="flex-1">
              {saving ? 'Creating…' : 'Create student'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
