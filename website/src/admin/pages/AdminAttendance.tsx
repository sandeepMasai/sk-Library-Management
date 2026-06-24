import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { useAuth } from '../../context/AuthContext';
import { AdminFilterPills } from '../components/AdminFilterPills';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { AttendanceAnalytics } from '../components/attendance/AttendanceAnalytics';
import { AttendanceDataTable } from '../components/attendance/AttendanceDataTable';
import { AttendanceLiveFeed } from '../components/attendance/AttendanceLiveFeed';
import { AttendanceQrScanner } from '../components/attendance/AttendanceQrScanner';
import { AttendanceRankings } from '../components/attendance/AttendanceRankings';
import { AttendanceReportModal } from '../components/attendance/AttendanceReportModal';
import { AttendanceSettingsPanel } from '../components/attendance/AttendanceSettingsPanel';
import { AttendanceSummaryCards } from '../components/attendance/AttendanceSummaryCards';
import {
  fetchAttendanceByDate,
  fetchAllocations,
  fetchBlockedAttempts,
  fetchDashboard,
  fetchLibraryProfile,
  fetchSeats,
  fetchStudents,
  generateQrToken,
  sendNotification,
  type AllocationRow,
  type AttendanceRow,
  type SeatRow,
} from '../api/libraryApi';
import { buildStudentSeatNumberMap } from '../utils/studentHelpers';
import {
  aggregatePresenceByStudent,
  buildLiveFeed,
  computeRankings,
  enrichAttendanceRow,
  exportAttendanceCsv,
  lastNDays,
  type EnrichedAttendanceRow,
  type TrendPoint,
} from '../utils/attendanceHelpers';
import {
  setCachedAttendanceQr,
} from '../utils/attendanceQrCache';

type PeriodTab = 'today' | 'weekly' | 'monthly' | 'custom';

export function AdminAttendance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const libraryId = user?.id ?? '';
  const today = new Date().toISOString().slice(0, 10);

  const [dash, setDash] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null);
  const [students, setStudents] = useState<Awaited<ReturnType<typeof fetchStudents>>>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [rawList, setRawList] = useState<AttendanceRow[]>([]);
  const [blockedAttempts, setBlockedAttempts] = useState<Awaited<ReturnType<typeof fetchBlockedAttempts>>>([]);
  const [weekTrend, setWeekTrend] = useState<TrendPoint[]>([]);
  const [monthTrend, setMonthTrend] = useState<TrendPoint[]>([]);
  const [dayTrend, setDayTrend] = useState<TrendPoint[]>([]);
  const [monthPresence, setMonthPresence] = useState<Map<string, number>>(new Map());
  const [activeMembersOnly, setActiveMembersOnly] = useState(true);
  const [libraryName, setLibraryName] = useState('');

  const [date, setDate] = useState(today);
  const [periodTab, setPeriodTab] = useState<PeriodTab>('today');
  const [analyticsTab, setAnalyticsTab] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [qrError, setQrError] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [reportFrom, setReportFrom] = useState(today);
  const [reportTo, setReportTo] = useState(today);

  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState('');

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const seatMap = useMemo(
    () => buildStudentSeatNumberMap(seats, allocations),
    [seats, allocations]
  );
  const activeStudents = dash?.students.active ?? students.filter((s) => !s.isBlocked).length;

  const enrichedRows = useMemo(
    () => rawList.map((r) => enrichAttendanceRow(r, studentMap, seatMap)),
    [rawList, studentMap, seatMap]
  );

  const present = periodTab === 'today' ? (dash?.attendance.todayCount ?? enrichedRows.length) : enrichedRows.length;
  const absent = Math.max(0, activeStudents - (periodTab === 'today' ? present : 0));
  const ratePct =
    periodTab === 'today'
      ? dash?.attendance.attendancePct ?? (activeStudents ? Math.round((present / activeStudents) * 100) : 0)
      : activeStudents
        ? Math.round((enrichedRows.length / activeStudents) * 100)
        : 0;
  const lateCount = enrichedRows.filter((r) => r.isLate).length;
  const blockedCount = blockedAttempts.length;

  const liveFeed = useMemo(
    () => buildLiveFeed(enrichedRows, blockedAttempts.slice(0, 10)),
    [enrichedRows, blockedAttempts]
  );

  const rankings = useMemo(
    () => computeRankings(students, monthPresence),
    [students, monthPresence]
  );

  const dailyTrend: TrendPoint[] = useMemo(
    () => (dayTrend.length > 0 ? dayTrend : [{ label: 'Today', dateStr: today, value: present, rate: ratePct }]),
    [dayTrend, today, present, ratePct]
  );

  const buildTrendPoints = (
    days: { dateStr: string; label: string }[],
    rowsByDay: AttendanceRow[][],
    activeCount: number
  ): TrendPoint[] =>
    days.map((d, i) => ({
      label: d.label,
      dateStr: d.dateStr,
      value: rowsByDay[i]?.length ?? 0,
      rate: activeCount ? Math.round(((rowsByDay[i]?.length ?? 0) / activeCount) * 100) : 0,
    }));

  const loadTrends = useCallback(async (activeCount: number) => {
    const weekDays = lastNDays(7);
    const monthDays = lastNDays(14);

    try {
      const [weekRows, monthRows] = await Promise.all([
        Promise.all(weekDays.map((d) => fetchAttendanceByDate(d.dateStr))),
        Promise.all(monthDays.map((d) => fetchAttendanceByDate(d.dateStr))),
      ]);

      setDayTrend(buildTrendPoints(weekDays, weekRows, activeCount));
      setWeekTrend(buildTrendPoints(weekDays, weekRows, activeCount));
      setMonthTrend(buildTrendPoints(monthDays, monthRows, activeCount));
      setMonthPresence(aggregatePresenceByStudent(monthRows));
    } catch {
      setDayTrend([]);
      setWeekTrend([]);
      setMonthTrend([]);
    }
  }, []);

  const applyQr = useCallback((qrToken: string, qrExpiresAt: string, message?: string) => {
    setToken(qrToken);
    setExpiresAt(qrExpiresAt);
    if (qrToken && qrExpiresAt) {
      setCachedAttendanceQr(qrToken, qrExpiresAt, libraryId || undefined);
    }
    if (message) setQrError(message);
    else setQrError('');
  }, [libraryId]);

  /** Always fetch live token from API (same source as mobile app). */
  const loadQr = useCallback(async () => {
    setQrLoading(true);
    setQrError('');
    try {
      const res = await generateQrToken(false);
      if (!res.token) {
        setToken('');
        setExpiresAt('');
        setQrError('No active QR for this month. Contact support if this persists.');
        return;
      }
      applyQr(res.token, res.expiresAt, res.locked && res.message ? res.message : undefined);
    } catch (e) {
      setQrError(e instanceof Error ? e.message : 'Failed to load QR');
    } finally {
      setQrLoading(false);
    }
  }, [applyQr]);

  const loadTable = useCallback(async (targetDate: string) => {
    setTableLoading(true);
    try {
      const rows = await fetchAttendanceByDate(targetDate);
      setRawList(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load attendance');
    } finally {
      setTableLoading(false);
    }
  }, []);

  const refreshLive = useCallback(async () => {
    try {
      const [blocked, rows] = await Promise.all([
        fetchBlockedAttempts(20),
        fetchAttendanceByDate(today),
      ]);
      setBlockedAttempts(blocked);
      if (periodTab === 'today') setRawList(rows);
    } catch {
      /* silent refresh */
    }
  }, [today, periodTab]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, studentRows, seatRows, allocationRows, profileRes, blocked] = await Promise.all([
        fetchDashboard(),
        fetchStudents(),
        fetchSeats(),
        fetchAllocations(),
        fetchLibraryProfile(),
        fetchBlockedAttempts(50),
      ]);

      setDash(dashRes);
      setStudents(studentRows);
      setSeats(seatRows);
      setAllocations(allocationRows);
      setActiveMembersOnly(profileRes.profile?.attendanceActiveMembersOnly !== false);
      setLibraryName(String(profileRes.profile?.libraryName || profileRes.profile?.name || ''));
      setBlockedAttempts(blocked);

      const activeCount =
        dashRes.students?.active ?? studentRows.filter((s) => !s.isBlocked).length;

      await loadTable(today);
      await loadTrends(activeCount);
      await loadQr();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [today, loadTable, loadTrends, loadQr]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (showScanner) {
      void loadQr();
    }
  }, [showScanner, loadQr]);

  useEffect(() => {
    if (periodTab === 'custom') {
      loadTable(date);
      return;
    }
    if (periodTab === 'today') {
      loadTable(today);
      return;
    }
    const days = periodTab === 'weekly' ? lastNDays(7) : lastNDays(14);
    setTableLoading(true);
    Promise.all(days.map((d) => fetchAttendanceByDate(d.dateStr)))
      .then((rows) => setRawList(rows.flat()))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setTableLoading(false));
  }, [date, periodTab, today, loadTable]);

  useEffect(() => {
    const id = window.setInterval(() => {
      refreshLive();
      if (activeStudents > 0) {
        loadTrends(activeStudents);
      }
    }, 30000);
    return () => window.clearInterval(id);
  }, [refreshLive, loadTrends, activeStudents]);

  async function handleSendWarning(studentId: string, name: string) {
    await sendNotification({
      title: 'Attendance warning',
      message: `Dear ${name}, your attendance is below 50% this month. Please improve your library attendance.`,
      targetType: 'student',
      targetId: studentId,
      category: 'attendance',
    });
  }

  async function handleBulkMessage() {
    const ids = [...selectedIds];
    if (!ids.length) return;
    const row = enrichedRows.find((r) => selectedIds.has(r.id));
    if (row) {
      await sendNotification({
        title: 'Attendance notice',
        message: 'Please maintain regular attendance at the library.',
        targetType: 'student',
        targetId: row.studentId,
        category: 'attendance',
      });
    }
    setSelectedIds(new Set());
  }

  return (
    <div className="admin-dashboard-pad page-pad">
      <AdminPageHeader
        title="📅 Attendance management"
        subtitle="Monitor student attendance, attendance trends, and scan activity in real time."
        actions={
          <>
            <Button onClick={() => setShowScanner(true)}>📷 Scan attendance</Button>
            <Button variant="outline" onClick={() => setShowReport(true)}>
              📥 Export report
            </Button>
            <Button variant="outline" onClick={() => setShowAnalytics(true)}>
              📊 View analytics
            </Button>
          </>
        }
      />

      <AttendanceSummaryCards
        present={present}
        absent={absent}
        ratePct={ratePct}
        late={lateCount}
        blocked={blockedCount}
        loading={loading}
      />

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AttendanceLiveFeed items={liveFeed} loading={loading} autoRefresh />
        </div>
        <GlassCard admin padding="md" className="flex flex-col justify-center text-center">
          <p className="text-xs font-semibold uppercase text-muted">Quick scan</p>
          <h3 className="font-display mt-2 text-lg font-bold">Display QR code</h3>
          <p className="mt-1 text-sm text-muted">Open full-screen scanner for student check-in</p>
          <Button className="mt-4" onClick={() => setShowScanner(true)}>
            Open scanner
          </Button>
        </GlassCard>
      </div>

      <GlassCard admin padding="md" className="mt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-semibold text-slate-900">Attendance records</h2>
          <AdminFilterPills
            options={[
              { value: 'today', label: 'Today' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'custom', label: 'Custom date' },
            ]}
            value={periodTab}
            onChange={(v) => setPeriodTab(v as PeriodTab)}
          />
        </div>

        {periodTab === 'custom' ? (
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="focus-ring-brand mt-4 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2 rounded-xl bg-primary/5 p-3">
            <span className="text-sm font-semibold">{selectedIds.size} selected</span>
            <button type="button" onClick={() => exportAttendanceCsv(enrichedRows.filter((r) => selectedIds.has(r.id)), date)} className="text-xs font-semibold text-primary">
              Export report
            </button>
            <button type="button" onClick={handleBulkMessage} className="text-xs font-semibold text-primary">
              Send message
            </button>
            <button type="button" onClick={() => setSelectedIds(new Set())} className="text-xs text-muted">
              Clear
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <AttendanceDataTable
            rows={enrichedRows}
            search={search}
            loading={loading || tableLoading}
            selectedIds={selectedIds}
            onSearchChange={setSearch}
            onToggleSelect={(id) =>
              setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAll={() => {
              const all = enrichedRows.every((r) => selectedIds.has(r.id));
              setSelectedIds(all ? new Set() : new Set(enrichedRows.map((r) => r.id)));
            }}
            onViewStudent={(id) => navigate('/admin/students', { state: { openStudentId: id } })}
          />
        </div>
      </GlassCard>

      <div className="mt-6 space-y-6">
        <AttendanceAnalytics
          daily={dailyTrend}
          weekly={weekTrend}
          monthly={monthTrend}
          tab={analyticsTab}
          onTabChange={setAnalyticsTab}
          loading={loading}
        />

        <AttendanceRankings
          top={rankings.top}
          low={rankings.low}
          onSendWarning={handleSendWarning}
          loading={loading}
        />

        <AttendanceSettingsPanel
          activeMembersOnly={activeMembersOnly}
          onUpdated={setActiveMembersOnly}
        />
      </div>

      <AttendanceQrScanner
        open={showScanner}
        token={token}
        expiresAt={expiresAt}
        loading={qrLoading}
        error={qrError}
        libraryName={libraryName}
        onClose={() => setShowScanner(false)}
      />

      <AttendanceReportModal
        open={showReport}
        rows={enrichedRows}
        dateFrom={reportFrom}
        dateTo={reportTo}
        reportType={reportType}
        onClose={() => setShowReport(false)}
        onReportTypeChange={setReportType}
        onDateFromChange={setReportFrom}
        onDateToChange={setReportTo}
      />

      {showAnalytics ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center">
          <GlassCard admin padding="md" className="w-full max-w-2xl">
            <div className="flex items-start justify-between">
              <h2 className="font-display text-xl font-bold">Attendance analytics</h2>
              <button type="button" onClick={() => setShowAnalytics(false)} className="text-muted">
                ✕
              </button>
            </div>
            <div className="mt-4">
              <AttendanceAnalytics
                daily={dailyTrend}
                weekly={weekTrend}
                monthly={monthTrend}
                tab={analyticsTab}
                onTabChange={setAnalyticsTab}
              />
            </div>
          </GlassCard>
        </div>
      ) : null}

      <p className="mt-6 text-center text-xs text-muted">
        Expired membership scans are blocked automatically.{' '}
        <Link to="/admin/students" className="font-semibold text-primary underline">
          Manage renewals
        </Link>
      </p>
    </div>
  );
}
