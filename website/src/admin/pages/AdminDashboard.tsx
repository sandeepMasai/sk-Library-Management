import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimateIn } from '../../components/ui/AnimateIn';
import { DashboardKpiCard } from '../../components/dashboard/DashboardKpiCard';
import { SeatMapPanel } from '../../components/dashboard/SeatMapPanel';
import { GlassCard } from '../../components/ui/GlassCard';
import { AdminActivityFeed } from '../components/AdminActivityFeed';
import { AdminAttendancePanel } from '../components/AdminAttendancePanel';
import { AdminCommunicationPanel } from '../components/AdminCommunicationPanel';
import { AdminDashboardHeader } from '../components/AdminDashboardHeader';
import { buildNotificationFeedItems, type NotificationFeedItem } from '../components/AdminNotificationPanel';
import { AdminDashboardSkeleton } from '../components/AdminDashboardSkeleton';
import { AdminFeePanel } from '../components/AdminFeePanel';
import { AdminMembershipPanel } from '../components/AdminMembershipPanel';
import { AdminQuickActions } from '../components/AdminQuickActions';
import { AdminRecentStudents } from '../components/AdminRecentStudents';
import { AdminReportsPanel } from '../components/AdminReportsPanel';
import {
  fetchAttendanceByDate,
  fetchCommunicationHistory,
  fetchCommunicationStats,
  fetchDashboard,
  fetchNotifications,
  markNotificationRead,
  fetchAllocations,
  fetchRenewalRequests,
  fetchSeats,
  fetchShifts,
  fetchStudentPayments,
  fetchStudents,
  type AllocationRow,
  type CommunicationMessage,
  type CommunicationStats,
  type DashboardData,
  type LibraryNotification,
  type SeatRow,
  type StudentPaymentRow,
  type StudentRow,
} from '../api/libraryApi';
import {
  buildMonthlyCollectionItems,
  sumMonthlyCollectionItems,
} from '../utils/monthlyCollection';
import {
  countUnreadIncoming,
  isLibraryIncomingUnread,
} from '../utils/notificationHelpers';

function formatRelativeTime(iso?: string | null) {
  if (!iso) return 'Recently';
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return 'Recently';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function countExpiringSoon(students: StudentRow[]) {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  return students.filter((student) => {
    if (!student.expiryDate) return false;
    const expiry = new Date(student.expiryDate).getTime();
    return expiry >= now && expiry <= now + weekMs;
  }).length;
}

function sortRecentStudents(students: StudentRow[]) {
  return [...students].sort((a, b) => {
    const aTime = a.joinDate ? new Date(a.joinDate).getTime() : 0;
    const bTime = b.joinDate ? new Date(b.joinDate).getTime() : 0;
    return bTime - aTime;
  });
}

async function fetchWeekAttendanceTrend() {
  const points: { dateStr: string; label: string }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    points.push({
      dateStr: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }).replace('.', '').slice(0, 3),
    });
  }
  const rows = await Promise.all(points.map((point) => fetchAttendanceByDate(point.dateStr)));
  return points.map((point, index) => ({ label: point.label, value: rows[index].length }));
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [seatAllocations, setSeatAllocations] = useState<AllocationRow[]>([]);
  const [seatShiftName, setSeatShiftName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [payments, setPayments] = useState<StudentPaymentRow[]>([]);
  const [notifications, setNotifications] = useState<LibraryNotification[]>([]);
  const [commHistory, setCommHistory] = useState<CommunicationMessage[]>([]);
  const [commStats, setCommStats] = useState<CommunicationStats | null>(null);
  const [weekTrend, setWeekTrend] = useState<{ label: string; value: number }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [seatsLoading, setSeatsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [commLoading, setCommLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [activity, setActivity] = useState<
    { id: string; title: string; subtitle?: string; time?: string; icon?: string }[]
  >([]);

  const loadSeatMap = useCallback(async () => {
    const [seatRows, shiftRows] = await Promise.all([fetchSeats(), fetchShifts()]);
    const shift = shiftRows[0];
    const allocRows = shift?.id
      ? await fetchAllocations({ shiftId: shift.id })
      : await fetchAllocations();
    return { seatRows, allocRows, shiftName: shift?.name ?? null };
  }, []);

  const loadDashboard = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setCommLoading(true);
    return Promise.all([
      fetchDashboard(),
      loadSeatMap(),
      fetchAttendanceByDate(today),
      fetchStudents(),
      fetchWeekAttendanceTrend(),
      fetchNotifications({ limit: 50 }),
      fetchCommunicationHistory(8),
      fetchCommunicationStats(),
      fetchStudentPayments(),
      fetchRenewalRequests('pending'),
    ])
      .then(
        ([
          dash,
          seatMapData,
          attendance,
          studentRows,
          trend,
          notificationRows,
          history,
          stats,
          paymentRows,
          renewals,
        ]) => {
          setData({
            ...dash,
            renewalRequests: { pending: renewals.pendingCount ?? dash.renewalRequests?.pending ?? 0 },
          });
          setSeats(seatMapData.seatRows);
          setSeatAllocations(seatMapData.allocRows);
          setSeatShiftName(seatMapData.shiftName);
          setStudents(studentRows);
          setWeekTrend(trend);
          setNotifications(notificationRows);
          setCommHistory(history);
          setCommStats(stats);
          setPayments(paymentRows);
          setActivity(
            attendance.slice(0, 6).map((row, i) => ({
              id: row.id || `${row.studentId}-${i}`,
              title: `${row.studentName || 'Student'} checked in`,
              time: row.checkInTime ? 'Today' : 'Today',
              icon: '✓',
            }))
          );
        }
      )
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => {
        setLoading(false);
        setSeatsLoading(false);
        setStudentsLoading(false);
        setCommLoading(false);
      });
  }, [loadSeatMap]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const refreshSeatMap = () => {
      loadSeatMap()
        .then((data) => {
          setSeats(data.seatRows);
          setSeatAllocations(data.allocRows);
          setSeatShiftName(data.shiftName);
        })
        .catch(() => {
          /* keep last good map */
        });
    };
    const id = window.setInterval(refreshSeatMap, 45_000);
    return () => window.clearInterval(id);
  }, [loadSeatMap]);

  const notificationItems = useMemo(() => {
    const extras: { id: string; title: string; time?: string; icon?: string }[] = [];

    if (data) {
      if (data.payments.feeDueCount > 0) {
        extras.push({
          id: 'fee-due',
          title: `${data.payments.feeDueCount} student(s) with fee due`,
          time: 'Action required',
          icon: '💰',
        });
      }
      if ((data.renewalRequests?.pending ?? 0) > 0) {
        extras.push({
          id: 'renewal',
          title: `${data.renewalRequests?.pending} renewal request(s) pending`,
          time: 'Review in students',
          icon: '📋',
        });
      }
      if (data.students.expired > 0) {
        extras.push({
          id: 'expired',
          title: `${data.students.expired} expired membership(s)`,
          time: 'Send reminders',
          icon: '⏰',
        });
      }
    }

    extras.push(...activity);
    return buildNotificationFeedItems(notifications, extras);
  }, [activity, data, notifications]);

  const unreadCount = useMemo(() => countUnreadIncoming(notifications), [notifications]);

  const monthlyItems = useMemo(
    () => buildMonthlyCollectionItems(students, payments),
    [students, payments]
  );

  const monthlyRevenue = useMemo(() => {
    const apiMonthly = data?.payments.monthlyCollection;
    const fromItems = sumMonthlyCollectionItems(monthlyItems);
    if (apiMonthly != null && apiMonthly > 0) return apiMonthly;
    return fromItems;
  }, [data?.payments.monthlyCollection, monthlyItems]);

  const monthlyPaymentCount = useMemo(() => {
    if (data?.payments.monthlyPaymentCount != null) return data.payments.monthlyPaymentCount;
    return monthlyItems.length;
  }, [data?.payments.monthlyPaymentCount, monthlyItems.length]);

  const handleNotificationClick = useCallback(async (item: NotificationFeedItem) => {
    if (!item.canMarkRead) return;
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, readByMe: true } : n))
    );
    try {
      await markNotificationRead(item.id);
    } catch {
      // Keep optimistic UI if request fails.
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    const unread = notifications.filter(isLibraryIncomingUnread);
    if (unread.length === 0 || markingAllRead) return;
    setMarkingAllRead(true);
    setNotifications((prev) =>
      prev.map((n) => (isLibraryIncomingUnread(n) ? { ...n, readByMe: true } : n))
    );
    try {
      await Promise.all(unread.map((n) => markNotificationRead(n.id)));
    } catch {
      // Best effort.
    } finally {
      setMarkingAllRead(false);
    }
  }, [markingAllRead, notifications]);

  if (loading) return <AdminDashboardSkeleton />;

  if (error) {
    return (
      <div className="page-pad admin-dashboard-pad">
        <GlassCard admin padding="md" className="border-amber-200/80">
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

  const present = data.attendance.todayCount;
  const absent = Math.max(0, data.students.active - present);
  const ratePct = data.attendance.attendancePct;
  const expiringSoon = countExpiringSoon(students);
  const paidStudents = Math.max(0, data.students.active - data.payments.feeDueCount);
  const recentStudents = sortRecentStudents(students);

  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="admin-dashboard-pad page-pad">
      <AdminDashboardHeader
        todayLabel={todayLabel}
        unreadCount={unreadCount}
        notificationItems={notificationItems}
        notificationsLoading={loading}
        markingAllRead={markingAllRead}
        onNotificationClick={handleNotificationClick}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onViewAllNotifications={() => {
          document.getElementById('admin-notifications')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard
          index={0}
          label="Total Students"
          value={data.students.total.toLocaleString('en-IN')}
          hint={`▲ ${data.students.active} active`}
          icon="👨‍🎓"
          accent="blue"
          dark
        />
        <DashboardKpiCard
          index={1}
          label="Monthly Collection"
          value={`₹${monthlyRevenue.toLocaleString('en-IN')}`}
          hint={`₹${data.payments.dueAmount.toLocaleString('en-IN')} pending`}
          icon="💰"
          accent="purple"
          dark
        />
        <DashboardKpiCard
          index={2}
          label="Attendance Today"
          value={String(present)}
          hint={`${ratePct}% present`}
          icon="📅"
          accent="green"
          trend={ratePct >= 70 ? '↑ On track' : undefined}
          dark
        />
        <DashboardKpiCard
          index={3}
          label="Fee Due Students"
          value={String(data.payments.feeDueCount)}
          hint={data.payments.feeDueCount > 0 ? 'Action required' : 'All clear'}
          icon="⚠️"
          accent="amber"
          dark
        />
      </div>

      <AnimateIn delay={0} className="mt-6">
        <AdminQuickActions />
      </AnimateIn>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AnimateIn delay={60}>
          <AdminAttendancePanel present={present} absent={absent} ratePct={ratePct} weekTrend={weekTrend} />
        </AnimateIn>
        <AnimateIn delay={120}>
          <AdminFeePanel
            monthlyTotal={monthlyRevenue}
            pending={data.payments.dueAmount}
            paidStudents={paidStudents}
            pendingStudents={data.payments.feeDueCount}
            items={monthlyItems}
          />
        </AnimateIn>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AnimateIn delay={60} className="xl:col-span-1">
          <AdminMembershipPanel
            active={data.students.active}
            expiringSoon={expiringSoon}
            expired={data.students.expired}
            pendingRenewals={data.renewalRequests?.pending ?? 0}
          />
        </AnimateIn>
        <AnimateIn delay={120} className="xl:col-span-2">
          <AdminRecentStudents students={recentStudents} loading={studentsLoading} />
        </AnimateIn>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AnimateIn delay={60} className="xl:col-span-2">
          <AdminCommunicationPanel
            history={commHistory}
            stats={commStats}
            loading={commLoading}
          />
        </AnimateIn>
        <AnimateIn delay={120}>
          <SeatMapPanel
            seats={seats}
            allocations={seatAllocations}
            shiftName={seatShiftName}
            loading={seatsLoading}
            admin
          />
        </AnimateIn>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <AnimateIn delay={60}>
          <AdminActivityFeed
            id="admin-notifications"
            items={notificationItems}
            loading={loading}
            onItemClick={handleNotificationClick}
          />
        </AnimateIn>
        <AnimateIn delay={120}>
          <AdminReportsPanel
            monthlyRevenue={monthlyRevenue}
            todayAttendance={present}
            feeDueCount={data.payments.feeDueCount}
            studentTotal={data.students.total}
            paymentCount={monthlyPaymentCount}
          />
        </AnimateIn>
      </div>
    </div>
  );
}
