import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchLibraryProfile } from '../api/libraryApi';

export function AdminSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetchLibraryProfile()
      .then((r) => setProfile(r.profile || null))
      .catch(() => setProfile(null));
  }, []);

  const p = profile || (user as Record<string, unknown>);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
      <p className="mt-1 text-sm text-muted">Library profile and account details.</p>

      <dl className="mt-8 max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm">
        <Row label="Library name" value={String(p.name || user?.name || '—')} />
        <Row label="Owner" value={String(p.ownerName || user?.ownerName || '—')} />
        <Row label="Email" value={String(p.email || user?.email || '—')} />
        <Row label="Library code" value={String(p.libraryCode || user?.libraryCode || '—')} highlight />
        <Row label="City" value={String(p.city || user?.city || '—')} />
        <Row label="State" value={String(p.state || user?.state || '—')} />
        <Row label="Plan" value={String(p.currentPlanKey || user?.currentPlanKey || 'none')} />
      </dl>

      <p className="mt-6 text-sm text-muted">
        For password change, branding, and message templates, use the SmartLibDesk mobile app.
      </p>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-50 pb-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-medium ${highlight ? 'text-primary' : 'text-slate-900'}`}>{value}</dd>
    </div>
  );
}
