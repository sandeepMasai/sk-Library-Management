import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { PageContainer } from '../components/ui/PageContainer';
import { StudentLibraryCard } from '../components/student/StudentLibraryCard';
import { useAuth } from '../context/AuthContext';
import { SITE } from '../content/site';
import { getPlayStoreUrl } from '../lib/appDownload';
import { fetchStudentMe, type StudentMeResponse } from '../lib/studentApi';
import { formatDisplayName } from '../utils/formatName';

function daysUntil(expiryDate?: string | null) {
  if (!expiryDate) return 0;
  const end = new Date(expiryDate).getTime();
  if (!Number.isFinite(end)) return 0;
  return Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
}

function formatExpiry(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'primary';
}) {
  const tones = {
    success: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
    warning: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
    danger: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
    primary: 'border-teal-400/30 bg-teal-500/10 text-teal-200',
  };
  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${tones[tone]}`}>
      <p className="text-lg" aria-hidden>
        {icon}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-white">{value}</p>
    </div>
  );
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'library') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'student') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchStudentMe();
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const student = data?.student ?? null;
  const profile = student || user;

  const daysLeft = useMemo(() => daysUntil(student?.expiryDate ?? user?.expiryDate), [student, user]);
  const isExpired = daysLeft < 0;
  const isExpiringSoon = !isExpired && daysLeft <= 7;

  const attendancePct = useMemo(() => {
    const monthCount = data?.attendance.monthCount ?? 0;
    const elapsed = new Date().getDate();
    if (elapsed <= 0) return 0;
    return Math.min(100, Math.round((monthCount / elapsed) * 100));
  }, [data?.attendance.monthCount]);

  const feeStatus = student?.feeStatus || user?.feeStatus || 'Pending';
  const feeTone =
    String(feeStatus).toLowerCase() === 'paid'
      ? 'success'
      : String(feeStatus).toLowerCase().includes('half')
        ? 'warning'
        : 'danger';

  if (!user || user.role === 'library') {
    return null;
  }

  const libraryName = student?.library?.libraryName || user.library?.libraryName || 'Library';
  const studentName = formatDisplayName(student?.name || user.name);

  return (
    <section className="student-dashboard-bg min-h-[calc(100dvh-4rem)] py-8 sm:py-12">
      <PageContainer size="sm">
        {loading ? (
          <div className="space-y-4">
            <div className="admin-skeleton h-16 rounded-2xl" />
            <div className="admin-skeleton h-72 rounded-3xl" />
            <div className="grid grid-cols-3 gap-3">
              <div className="admin-skeleton h-24 rounded-2xl" />
              <div className="admin-skeleton h-24 rounded-2xl" />
              <div className="admin-skeleton h-24 rounded-2xl" />
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-100">
            {error}
            <Button variant="outline" className="mt-4 w-full" onClick={logout}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/15 text-lg">🏛️</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{libraryName}</p>
                <p className="truncate text-xs text-white/65">
                  {studentName}
                  {student?.mobile || user.mobile ? ` · ${student?.mobile || user.mobile}` : ''}
                </p>
              </div>
              {data?.seat?.number != null ? (
                <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-1 text-xs font-bold text-white">
                  Seat {data.seat.number}
                </span>
              ) : null}
            </div>

            {profile ? <StudentLibraryCard user={profile} /> : null}

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
              <span aria-hidden>📅</span>
              <span className="text-white/60">Membership expires:</span>
              <span
                className={`font-bold ${
                  isExpired ? 'text-rose-300' : isExpiringSoon ? 'text-amber-300' : 'text-white'
                }`}
              >
                {formatExpiry(student?.expiryDate ?? user.expiryDate)}
                {isExpired ? ' (Expired)' : null}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatPill
                icon="⏳"
                label="Days left"
                value={isExpired ? 'Expired' : String(Math.max(0, daysLeft))}
                tone={isExpired ? 'danger' : isExpiringSoon ? 'warning' : 'success'}
              />
              <StatPill icon="📊" label="Attendance" value={`${attendancePct}%`} tone="primary" />
              <StatPill
                icon="💰"
                label="Fee"
                value={String(feeStatus).includes('Half') ? 'Half' : feeStatus}
                tone={feeTone}
              />
            </div>

            {data?.attendance.markedToday != null ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <span className="font-semibold text-white">Today: </span>
                {data.attendance.markedToday ? (
                  <span className="text-emerald-300">Present ✓</span>
                ) : (
                  <span className="text-amber-200">Not marked yet</span>
                )}
              </div>
            ) : null}

            {(isExpired || isExpiringSoon) && (
              <Link to="/dashboard/renew" className="block">
                <div
                  className={`rounded-2xl px-4 py-4 text-white shadow-lg ${
                    isExpired
                      ? 'bg-gradient-to-r from-rose-800 to-rose-700'
                      : 'bg-gradient-to-r from-amber-800 to-amber-700'
                  }`}
                >
                  <p className="font-bold">{isExpired ? 'Membership expired' : 'Membership expiring soon'}</p>
                  <p className="mt-1 text-sm text-white/85">
                    Tap to request plan renewal from your library.
                  </p>
                </div>
              </Link>
            )}

            <Link to="/dashboard/renew" className="block">
              <Button fullWidth size="lg">
                {isExpired ? 'Renew membership' : 'Extend / renew plan'}
              </Button>
            </Link>

            {data?.notifications && data.notifications.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <h2 className="text-sm font-bold text-white">Recent updates</h2>
                <ul className="mt-3 space-y-2">
                  {data.notifications.slice(0, 4).map((n) => (
                    <li key={n.id} className="rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                      <p className="text-sm font-semibold text-white">{n.title || 'Notification'}</p>
                      {n.message ? <p className="mt-1 text-xs text-white/65">{n.message}</p> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-white/70">
                Use the {SITE.name} mobile app for QR attendance scan and instant notifications.
              </p>
              <a href={getPlayStoreUrl()} className="mt-3 block" rel="noopener noreferrer">
                <Button variant="outline" fullWidth>
                  Get on Google Play
                </Button>
              </a>
              <p className="mt-3 text-xs text-white/55">
                Open the app → <strong className="text-white/80">Scan</strong> tab → scan your library&apos;s
                attendance QR at check-in time.
              </p>
            </div>

            <Button variant="outline" className="w-full" onClick={logout}>
              Sign out
            </Button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-white/55">
          Library owner?{' '}
          <Link to="/login" className="font-semibold text-teal-300 hover:text-teal-200">
            Sign in as library
          </Link>
        </p>
      </PageContainer>
    </section>
  );
}
