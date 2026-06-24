import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { StudentAddModal } from '../components/students/StudentAddModal';
import { StudentBulkBar } from '../components/students/StudentQuickMenu';
import { StudentDataTable } from '../components/students/StudentDataTable';
import { StudentDetailDrawer } from '../components/students/StudentDetailDrawer';
import { StudentMessageModal } from '../components/students/StudentMessageModal';
import { StudentMobileList } from '../components/students/StudentQuickMenu';
import {
  DEFAULT_ADVANCED_FILTERS,
  StudentSearchFilters,
} from '../components/students/StudentSearchFilters';
import { StudentSummaryCards } from '../components/students/StudentSummaryCards';
import {
  approveRenewalRequest,
  deleteStudent,
  fetchAttendanceByDate,
  fetchLibraryProfile,
  fetchRenewalRequests,
  fetchAllocations,
  fetchSeats,
  fetchStudentAttendance,
  fetchStudents,
  rejectRenewalRequest,
  toggleBlockStudent,
  type RenewalRequestRow,
  type SeatRow,
  type StudentRow,
  type AllocationRow,
} from '../api/libraryApi';
import {
  buildSeatMaps,
  calcAttendancePct,
  enrichStudent,
  exportStudentsCsv,
  filterStudentsAdvanced,
  studentStats,
  type AdvancedFilters,
} from '../utils/studentHelpers';

const PAGE_SIZE = 20;

export function AdminStudents() {
  const location = useLocation();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [renewals, setRenewals] = useState<RenewalRequestRow[]>([]);
  const [libraryName, setLibraryName] = useState('');
  const [presentTodaySet, setPresentTodaySet] = useState<Set<string>>(new Set());
  const [attendancePctMap, setAttendancePctMap] = useState<Map<string, number>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState<'all' | 'name' | 'phone' | 'email' | 'id' | 'seat'>('all');
  const [filters, setFilters] = useState<AdvancedFilters>(DEFAULT_ADVANCED_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'edit'>('overview');
  const [showAdd, setShowAdd] = useState(false);
  const [messageTargets, setMessageTargets] = useState<string[]>([]);
  const [renewalBusy, setRenewalBusy] = useState<string | null>(null);

  const seatMap = useMemo(() => buildSeatMaps(seats, allocations), [seats, allocations]);

  const load = useCallback(() => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      fetchStudents(),
      fetchRenewalRequests('pending'),
      fetchSeats(),
      fetchAllocations(),
      fetchLibraryProfile(),
      fetchAttendanceByDate(today),
    ])
      .then(([studentRows, renewalRes, seatRows, allocationRows, profileRes, todayAtt]) => {
        setStudents(studentRows);
        setRenewals(renewalRes.requests);
        setSeats(seatRows);
        setAllocations(allocationRows);
        setLibraryName(String(profileRes.profile?.libraryName || profileRes.profile?.name || ''));
        setPresentTodaySet(new Set(todayAtt.map((a) => a.studentId)));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const openId = (location.state as { openStudentId?: string } | null)?.openStudentId;
    if (openId) {
      setSelectedId(openId);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const enriched = useMemo(
    () =>
      students.map((s) =>
        enrichStudent(s, seatMap, attendancePctMap, presentTodaySet)
      ),
    [students, seatMap, attendancePctMap, presentTodaySet]
  );

  const filtered = useMemo(
    () => filterStudentsAdvanced(enriched, search, searchField, filters, 'all'),
    [enriched, search, searchField, filters]
  );

  const stats = useMemo(() => studentStats(students), [students]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStudents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  useEffect(() => {
    setPage(1);
  }, [search, searchField, filters]);

  const pageStudentIds = useMemo(
    () => pageStudents.map((s) => s.id).join(','),
    [pageStudents]
  );

  useEffect(() => {
    if (!pageStudentIds) return;
    let cancelled = false;
    const ids = pageStudentIds.split(',').filter(Boolean);
    const loadAttendance = async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const days = await fetchStudentAttendance(id);
            return { id, pct: calcAttendancePct(days.length) };
          } catch {
            return { id, pct: null as number | null };
          }
        })
      );
      if (cancelled) return;
      setAttendancePctMap((prev) => {
        let changed = false;
        const next = new Map(prev);
        for (const r of results) {
          if (r.pct == null) continue;
          if (next.get(r.id) !== r.pct) {
            next.set(r.id, r.pct);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };
    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, [pageStudentIds]);

  const selectedStudent = useMemo(
    () => (selectedId ? enriched.find((s) => s.id === selectedId) ?? null : null),
    [enriched, selectedId]
  );

  const selectedSeat = useMemo(() => {
    if (!selectedStudent?.seatId) return null;
    return seats.find((s) => (s._id || s.id) === selectedStudent.seatId) ?? null;
  }, [selectedStudent, seats]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPage() {
    const allOnPage = pageStudents.every((s) => selectedIds.has(s.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPage) pageStudents.forEach((s) => next.delete(s.id));
      else pageStudents.forEach((s) => next.add(s.id));
      return next;
    });
  }

  function openStudent(id: string, tab: 'overview' | 'edit' = 'overview') {
    setSelectedId(id);
    setDrawerTab(tab);
  }

  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} students?`)) return;
    for (const id of selectedIds) {
      await deleteStudent(id);
    }
    setSelectedIds(new Set());
    load();
  }

  function handleImportClick() {
    alert('Import students via the SmartLibDesk mobile app (Excel import).');
  }

  const messageNames = messageTargets
    .map((id) => students.find((s) => s.id === id)?.name || '')
    .filter(Boolean);

  return (
    <div className="admin-dashboard-pad page-pad">
      <AdminPageHeader
        title="👨‍🎓 Students"
        subtitle="Manage student profiles, memberships, attendance, fees, seats and communication."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowAdd(true)}>+ Add student</Button>
            <Button variant="outline" onClick={handleImportClick}>
              Import Excel
            </Button>
            <Button variant="outline" onClick={() => exportStudentsCsv(filtered)} disabled={!filtered.length}>
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setMessageTargets(selectedIds.size ? [...selectedIds] : filtered.slice(0, 1).map((s) => s.id))}
              disabled={!filtered.length}
            >
              Send message
            </Button>
          </div>
        }
      />

      <StudentSummaryCards stats={stats} loading={loading} />

      {renewals.length > 0 ? (
        <GlassCard admin padding="md" className="mt-6 border-amber-200/60">
          <h2 className="font-semibold text-slate-900">Pending renewal requests ({renewals.length})</h2>
          <ul className="mt-3 space-y-2">
            {renewals.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{row.studentName}</p>
                  <p className="text-xs text-muted">{row.mobile || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={renewalBusy === row.id}
                    onClick={async () => {
                      setRenewalBusy(row.id);
                      try {
                        await approveRenewalRequest(row.id);
                        load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Approve failed');
                      } finally {
                        setRenewalBusy(null);
                      }
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={renewalBusy === row.id}
                    onClick={async () => {
                      setRenewalBusy(row.id);
                      try {
                        await rejectRenewalRequest(row.id);
                        load();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Reject failed');
                      } finally {
                        setRenewalBusy(null);
                      }
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </GlassCard>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <GlassCard admin padding="md" className="mt-6">
        <StudentSearchFilters
          search={search}
          searchField={searchField}
          filters={filters}
          showFilters={showFilters}
          onSearchChange={setSearch}
          onSearchFieldChange={setSearchField}
          onFiltersChange={setFilters}
          onToggleFilters={() => setShowFilters((v) => !v)}
          onResetFilters={() => setFilters(DEFAULT_ADVANCED_FILTERS)}
        />

        <div className="mt-4">
          <StudentBulkBar
            count={selectedIds.size}
            onMessage={() => setMessageTargets([...selectedIds])}
            onExport={() => exportStudentsCsv(filtered.filter((s) => selectedIds.has(s.id)))}
            onDelete={handleBulkDelete}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="admin-skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-6">
            <AdminEmptyState
              icon="👨‍🎓"
              title="No students found"
              description="Add your first student to get started."
              action={<Button onClick={() => setShowAdd(true)}>Add student</Button>}
            />
          </div>
        ) : (
          <>
            <p className="mt-4 text-xs text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>

            <div className="mt-4">
              <StudentDataTable
                students={pageStudents}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleAll={toggleAllPage}
                onView={(id) => openStudent(id, 'overview')}
                onEdit={(id) => openStudent(id, 'edit')}
                onBlock={async (id) => {
                  await toggleBlockStudent(id);
                  load();
                }}
                onDelete={async (id) => {
                  if (confirm('Delete this student?')) {
                    await deleteStudent(id);
                    load();
                  }
                }}
                onMessage={(id) => setMessageTargets([id])}
              />
            </div>

            <StudentMobileList students={pageStudents} onView={(id) => openStudent(id)} />

            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <span className="text-sm text-muted">
                  Page {page} of {totalPages}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </GlassCard>

      <StudentAddModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(created) => {
          load();
          if (created?.id) {
            setSelectedId(created.id);
            setDrawerTab('overview');
          }
        }}
      />

      {selectedId ? (
        <StudentDetailDrawer
          studentId={selectedId}
          seat={selectedSeat}
          seatLabel={selectedStudent?.seatLabel}
          seatShiftName={selectedStudent?.shiftName}
          libraryName={libraryName}
          initialTab={drawerTab}
          onClose={() => setSelectedId(null)}
          onUpdated={load}
          onMessage={() => setMessageTargets([selectedId])}
        />
      ) : null}

      <StudentMessageModal
        open={messageTargets.length > 0}
        studentIds={messageTargets}
        studentNames={messageNames}
        onClose={() => setMessageTargets([])}
      />
    </div>
  );
}
