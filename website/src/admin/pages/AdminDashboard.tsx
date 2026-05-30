import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimateIn } from '../../components/ui/AnimateIn';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { DashboardPageHeader } from '../../components/dashboard/DashboardPageHeader';
import { RecentActivityPanel } from '../../components/dashboard/RecentActivityPanel';
import { SeatMapPanel } from '../../components/dashboard/SeatMapPanel';
import { GlassCard } from '../../components/ui/GlassCard';
import {
  fetchAttendanceByDate,
  fetchDashboard,
  fetchSeats,
  type DashboardData,
  type SeatRow,
} from '../api/libraryApi';

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [activity, setActivity] = useState<
    { id: string; title: string; subtitle?: string; time?: string; icon?: string }[]
  >([]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([fetchDashboard(), fetchSeats(), fetchAttendanceByDate(today)])
      .then(([dash, seatRows, attendance]) => {
        setData(dash);
        setSeats(seatRows);
        setActivity(
          attendance.slice(0, 8).map((row, i) => ({
            id: row.id || `${row.studentId}-${i}`,
            title: `${row.studentName || 'Student'} checked in`,
            subtitle: 'Attendance QR scan',
            time: row.checkInTime || 'Today',
            icon: '✓',
          }))
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        setLoading(false);
        setSeatsLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="page-pad text-muted">Loading command center…</p>;
  }

  if (error) {
    return (
      <div className="page-pad">
        <GlassCard padding="md" className="border-amber-200/80 !bg-amber-50/80">
          <p className="text-sm text-amber-900">
            {error.includes('subscription') || error.includes('403') ? (
              <>
                Subscription required.{' '}
                <Link to="/admin/subscription" className="font-semibold underline">
                  Activate a plan
                </Link>
              </>
            ) : (
              error
            )}
          </p>
        </GlassCard>
      </div>
    );
  }

  if (!data) return null;

  const occupiedSeats = seats.filter((s) => s.studentId || s.status === 'occupied').length;
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="page-pad">
      <DashboardPageHeader
        title="Library Admin Command Center"
        subtitle={todayLabel}
        action={{ label: 'Export Report', to: '/admin/students' }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          index={0}
          label="Total Students"
          value={data.students.total.toLocaleString('en-IN')}
          hint={`${data.students.active} active`}
          icon="👥"
          accent="blue"
        />
        <DashboardKpiCard
          index={1}
          label="Today's Attendance"
          value={`${data.attendance.attendancePct}%`}
          hint={`${data.attendance.todayCount} check-ins`}
          icon="📊"
          accent="green"
          trend={data.attendance.attendancePct >= 70 ? '↑ On track' : undefined}
        />
        <DashboardKpiCard
          index={2}
          label="Fees Collected"
          value={`₹${data.payments.collectedAmount.toLocaleString('en-IN')}`}
          hint={`₹${data.payments.dueAmount.toLocaleString('en-IN')} due`}
          icon="💰"
          accent="purple"
        />
        <DashboardKpiCard
          index={3}
          label="Occupied Seats"
          value={`${occupiedSeats}/${seats.length || '—'}`}
          hint={seats.length ? `${Math.round((occupiedSeats / seats.length) * 100)}% utilization` : 'Configure seats'}
          icon="🪑"
          accent="cyan"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AnimateIn delay={0} className="xl:col-span-2">
          <SeatMapPanel seats={seats} loading={seatsLoading} />
        </AnimateIn>
        <AnimateIn delay={120}>
          <RecentActivityPanel items={activity} loading={loading} />
        </AnimateIn>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GlassCard padding="md">
          <h3 className="font-semibold text-slate-900">Payments summary</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Collected</dt>
              <dd className="font-semibold">₹{data.payments.collectedAmount.toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Due</dt>
              <dd className="font-semibold text-amber-700">₹{data.payments.dueAmount.toLocaleString('en-IN')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Pending renewals</dt>
              <dd className="font-semibold">{data.renewalRequests?.pending ?? 0}</dd>
            </div>
          </dl>
        </GlassCard>
        <GlassCard padding="md" className="sm:col-span-2">
          <h3 className="font-semibold text-slate-900">Quick actions</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { to: '/admin/students', label: '+ Add student' },
              { to: '/admin/attendance', label: 'Display QR' },
              { to: '/admin/seats', label: 'Seat map' },
              { to: '/admin/subscription', label: 'Subscription' },
              { to: '/download', label: 'Download app' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
