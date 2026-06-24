import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { GlassCard } from '../components/ui/GlassCard';
import { PageContainer } from '../components/ui/PageContainer';
import { useAuth } from '../context/AuthContext';
import {
  fetchRenewDashboard,
  submitRenewalRequest,
  type RenewalDuration,
  type RenewalRequest,
  type RenewContext,
} from '../lib/studentApi';

const DURATIONS: { days: RenewalDuration; label: string }[] = [
  { days: 30, label: '1 Month' },
  { days: 90, label: '3 Months' },
  { days: 180, label: '6 Months' },
  { days: 365, label: '1 Year' },
];

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusStyle(status: RenewalRequest['status']) {
  if (status === 'approved') return { bg: 'bg-emerald-50 text-emerald-700', label: 'Approved' };
  if (status === 'rejected') return { bg: 'bg-rose-50 text-rose-700', label: 'Rejected' };
  return { bg: 'bg-amber-50 text-amber-700', label: 'Pending' };
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export function StudentRenew() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [context, setContext] = useState<RenewContext | null>(null);
  const [requests, setRequests] = useState<RenewalRequest[]>([]);
  const [duration, setDuration] = useState<RenewalDuration>(30);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [banner, setBanner] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null);

  const hasPending = requests.some((r) => r.status === 'pending');
  const selectedShift = context?.shifts.find((s) => s.id === shiftId);

  const applyDashboard = useCallback((data: Awaited<ReturnType<typeof fetchRenewDashboard>>) => {
    setContext({
      libraryName: data.libraryName,
      seatNumber: data.seatNumber,
      currentTiming: data.currentTiming,
      currentShiftId: data.currentShiftId,
      shifts: data.shifts,
    });
    setRequests(data.requests);
    setShiftId((prev) => {
      if (prev) return prev;
      if (data.currentShiftId) return data.currentShiftId;
      if (data.shifts[0]) return data.shifts[0].id;
      return null;
    });
  }, []);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const data = await fetchRenewDashboard();
        applyDashboard(data);
      } catch (e) {
        setBanner({ tone: 'error', text: e instanceof Error ? e.message : 'Failed to load renewal data' });
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [applyDashboard]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load({ silent: true });
    setRefreshing(false);
  };

  const expiryDate = useMemo(() => {
    const fromUser = (user as { expiryDate?: string } | null)?.expiryDate;
    const pending = requests.find((r) => r.status === 'pending')?.currentExpiryDate;
    return fromUser || pending || null;
  }, [user, requests]);

  const onSubmit = async () => {
    setBanner(null);
    if (hasPending) {
      setBanner({ tone: 'info', text: 'You already have a renewal request awaiting approval.' });
      return;
    }
    if (!selectedShift && !context?.currentTiming) {
      setBanner({ tone: 'error', text: 'Please choose a shift/timing for your renewal.' });
      return;
    }

    setSubmitting(true);
    try {
      const request = await submitRenewalRequest({
        requestedDuration: duration,
        requestedShiftId: shiftId || undefined,
        requestedTiming: selectedShift?.name || context?.currentTiming,
        note: note.trim(),
      });
      setNote('');
      setRequests((prev) => [request, ...prev.filter((r) => r.id !== request.id)]);
      setBanner({
        tone: 'success',
        text: 'Request sent. Your librarian will review and approve your renewal soon.',
      });
    } catch (e) {
      setBanner({ tone: 'error', text: e instanceof Error ? e.message : 'Could not submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="bg-white py-16">
        <PageContainer size="sm">
          <div className="flex min-h-[40vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          </div>
        </PageContainer>
      </section>
    );
  }

  return (
    <section className="bg-white py-10 sm:py-14">
      <PageContainer size="sm">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Student account</p>
            <h1 className="font-display mt-1 text-2xl font-bold text-slate-900">Renew / Extend Plan</h1>
            <p className="mt-1 text-sm text-muted">
              Send a request to your library. Seat and timing stay the same after approval.
            </p>
          </div>
          <Link to="/dashboard" className="shrink-0 text-sm font-semibold text-primary hover:underline">
            ← Back
          </Link>
        </div>

        {banner ? (
          <div
            className={`mb-4 rounded-xl border px-4 py-3 text-sm ${
              banner.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : banner.tone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <GlassCard padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">Your membership</h2>
          <div className="mt-2 divide-y divide-slate-100">
            <InfoRow label="Name" value={user?.name || '—'} />
            <InfoRow label="Mobile" value={user?.mobile || user?.username || '—'} />
            <InfoRow label="Library" value={context?.libraryName || user?.library?.libraryName || '—'} />
            <InfoRow label="Expires" value={formatDate(expiryDate)} />
            {context?.seatNumber != null ? <InfoRow label="Seat" value={`#${context.seatNumber}`} /> : null}
            <InfoRow label="Current timing" value={context?.currentTiming || '—'} />
          </div>
        </GlassCard>

        <GlassCard padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">Requested duration</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {DURATIONS.map((d) => {
              const active = duration === d.days;
              return (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDuration(d.days)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? 'border-primary bg-teal-50 text-primary'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </GlassCard>

        {context && context.shifts.length > 0 ? (
          <GlassCard padding="md" className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">Requested timing</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {context.shifts.map((s) => {
                const active = shiftId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShiftId(s.id)}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                      active
                        ? 'border-primary bg-teal-50 text-primary'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40'
                    }`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>
          </GlassCard>
        ) : null}

        <GlassCard padding="md" className="mb-4">
          <h2 className="text-sm font-bold text-slate-900">Note (optional)</h2>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Any message for the librarian…"
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-primary/20 focus:border-primary focus:ring-2"
          />
        </GlassCard>

        <Button
          fullWidth
          size="lg"
          disabled={submitting || hasPending}
          onClick={onSubmit}
          className="mb-6"
        >
          {submitting ? 'Sending…' : hasPending ? 'Request pending' : 'Send renewal request'}
        </Button>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wide text-muted uppercase">Request history</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {requests.length === 0 ? (
          <GlassCard padding="md" className="text-center">
            <p className="text-sm text-muted">No requests yet</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => {
              const st = statusStyle(r.status);
              return (
                <GlassCard key={r.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-900">{r.requestedDurationLabel}</p>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${st.bg}`}>{st.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-muted">Timing: {r.requestedTiming || '—'}</p>
                  {r.createdAt ? (
                    <p className="mt-1 text-xs text-muted">Requested {formatDateTime(r.createdAt)}</p>
                  ) : null}
                  {r.status === 'approved' && r.newExpiryDate ? (
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                      New expiry: {formatDate(r.newExpiryDate)}
                    </p>
                  ) : null}
                  {r.status === 'rejected' && r.rejectReason ? (
                    <p className="mt-2 text-sm text-rose-700">{r.rejectReason}</p>
                  ) : null}
                </GlassCard>
              );
            })}
          </div>
        )}
      </PageContainer>
    </section>
  );
}
