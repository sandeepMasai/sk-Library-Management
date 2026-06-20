import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { GlassCard } from '../../components/ui/GlassCard';
import { AdminEmptyState } from '../components/AdminEmptyState';
import { AdminPageHeader } from '../components/AdminPageHeader';
import { SeatAllocationModal } from '../components/seats/SeatAllocationModal';
import { SeatCardGrid } from '../components/seats/SeatCardGrid';
import { SeatQuickAddModals, SeatShiftModals } from '../components/seats/SeatShiftModals';
import {
  assignAllocation,
  bulkCreateSeats,
  cancelAllocation,
  createShift,
  createSpace,
  deleteShift,
  fetchAllocations,
  fetchSeats,
  fetchShifts,
  fetchSpaces,
  fetchStudents,
  updateShift,
  type SeatRow,
  type ShiftRow,
  type SpaceRow,
  type StudentRow,
} from '../api/libraryApi';
import {
  buildAllocationMap,
  buildSpaceMap,
  enrichSeat,
  exportSeatsCsv,
  filterSeatCards,
  formatShiftTime,
  scopeStats,
  SHIFT_TYPE_PRESETS,
  shiftSaveName,
  type EnrichedSeat,
} from '../utils/seatHelpers';

export function AdminSeats() {
  const [seats, setSeats] = useState<SeatRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [allocations, setAllocations] = useState<Awaited<ReturnType<typeof fetchAllocations>>>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'vacant' | 'occupied'>('all');
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [addSeatsOpen, setAddSeatsOpen] = useState(false);
  const [addSpaceOpen, setAddSpaceOpen] = useState(false);
  const [totalSeatsInput, setTotalSeatsInput] = useState('100');
  const [spaceNameInput, setSpaceNameInput] = useState('');

  const [manageShiftsOpen, setManageShiftsOpen] = useState(false);
  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftRow | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [activeSeat, setActiveSeat] = useState<EnrichedSeat | null>(null);
  const [unassignTarget, setUnassignTarget] = useState<EnrichedSeat | null>(null);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const spaceMap = useMemo(() => buildSpaceMap(spaces), [spaces]);
  const allocationMap = useMemo(() => buildAllocationMap(allocations), [allocations]);
  const activeShift = useMemo(() => shifts.find((s) => s.id === selectedShiftId), [shifts, selectedShiftId]);

  const scopedSeats = useMemo(() => {
    if (!selectedSpaceId) return seats;
    return seats.filter((s) => (s.spaceId || null) === selectedSpaceId);
  }, [seats, selectedSpaceId]);

  const enriched = useMemo(
    () =>
      scopedSeats.map((s) =>
        enrichSeat(s, studentMap, {
          spaceMap,
          shiftName: activeShift?.name,
          allocationBySeat: allocationMap,
          useAllocations: Boolean(selectedShiftId),
        })
      ),
    [scopedSeats, studentMap, spaceMap, activeShift, allocationMap, selectedShiftId]
  );

  const filtered = useMemo(
    () => filterSeatCards(enriched, search, statusFilter),
    [enriched, search, statusFilter]
  );

  const stats = useMemo(
    () => scopeStats(seats, allocationMap, selectedSpaceId, students.length),
    [seats, allocationMap, selectedSpaceId, students.length]
  );

  const loadAllocations = useCallback(async (shiftId: string, spaceId?: string | null) => {
    const rows = await fetchAllocations({ shiftId, spaceId: spaceId || undefined });
    setAllocations(rows);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [seatRows, studentRows, spaceRows, shiftRows] = await Promise.all([
        fetchSeats(),
        fetchStudents(),
        fetchSpaces(),
        fetchShifts(),
      ]);
      setSeats(seatRows);
      setStudents(studentRows);
      setSpaces(spaceRows);
      setShifts(shiftRows);

      const shiftId = selectedShiftId && shiftRows.some((s) => s.id === selectedShiftId)
        ? selectedShiftId
        : shiftRows[0]?.id ?? null;
      if (shiftId && shiftId !== selectedShiftId) setSelectedShiftId(shiftId);
      if (shiftId) await loadAllocations(shiftId, selectedSpaceId);
      else setAllocations([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load seats');
    } finally {
      setLoading(false);
    }
  }, [selectedShiftId, selectedSpaceId, loadAllocations]);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedShiftId) return;
    loadAllocations(selectedShiftId, selectedSpaceId).catch(() => setAllocations([]));
  }, [selectedShiftId, selectedSpaceId, loadAllocations]);

  useEffect(() => {
    if (!selectedShiftId && shifts.length) setSelectedShiftId(shifts[0].id);
  }, [shifts, selectedShiftId]);

  function onSeatPress(seat: EnrichedSeat) {
    if (seat.tone === 'occupied' && seat.allocationId) {
      setUnassignTarget(seat);
      return;
    }
    if (!selectedShiftId) {
      setError('Please create or select a shift before assigning a seat.');
      return;
    }
    setActiveSeat(seat);
    setAssignOpen(true);
  }

  async function handleAssign(studentId: string, startDate: string, endDate: string) {
    if (!activeSeat || !selectedShiftId) return;
    if (new Date(endDate).getTime() <= new Date(startDate).getTime()) {
      setError('End date must be after start date.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await assignAllocation({
        seatId: activeSeat.seatId,
        studentId,
        shiftId: selectedShiftId,
        startDate,
        endDate,
      });
      setAssignOpen(false);
      setActiveSeat(null);
      await loadAllocations(selectedShiftId, selectedSpaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleUnassign() {
    if (!unassignTarget?.allocationId || !selectedShiftId) return;
    setBusy(true);
    setError('');
    try {
      await cancelAllocation(unassignTarget.allocationId);
      setUnassignTarget(null);
      await loadAllocations(selectedShiftId, selectedSpaceId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unassign failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkCreate() {
    const n = Number(totalSeatsInput);
    if (!Number.isInteger(n) || n < 1) {
      setError('Enter a valid seat count');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await bulkCreateSeats(n, selectedSpaceId);
      setAddSeatsOpen(false);
      setQuickAddOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create seats');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateSpace() {
    const name = spaceNameInput.trim();
    if (!name) return;
    setBusy(true);
    try {
      await createSpace(name);
      setAddSpaceOpen(false);
      setSpaceNameInput('');
      setQuickAddOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create space');
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateDefaultShifts() {
    setBusy(true);
    setError('');
    try {
      for (const key of Object.keys(SHIFT_TYPE_PRESETS) as (keyof typeof SHIFT_TYPE_PRESETS)[]) {
        const p = SHIFT_TYPE_PRESETS[key];
        const exists = shifts.some((s) => s.type === key);
        if (exists) continue;
        await createShift({
          name: shiftSaveName(key, p.startMin, p.endMin),
          type: key,
          startTime: minutesToTime(p.startMin),
          endTime: minutesToTime(p.endMin),
        });
      }
      setManageShiftsOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create shifts');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveShift(payload: { name: string; type: string; startTime: string; endTime: string }) {
    setBusy(true);
    try {
      if (editingShift) await updateShift(editingShift.id, payload);
      else await createShift(payload);
      setShiftFormOpen(false);
      setEditingShift(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save shift');
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteShift(id: string) {
    if (!confirm('Delete this shift? Unassign all seats first if delete fails.')) return;
    setBusy(true);
    try {
      await deleteShift(id);
      if (selectedShiftId === id) setSelectedShiftId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete shift failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-dashboard-pad page-pad seat-page pb-24 lg:pb-8">
      <AdminPageHeader
        title="Seat Management"
        subtitle="Manage seats, spaces, shifts, and student allocations — same 100 seats can serve Morning + Evening batches."
        actions={
          <>
            <div className="relative">
              <Button variant="outline" onClick={() => setQuickAddOpen((v) => !v)}>
                + Quick add
              </Button>
              {quickAddOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-white/20 bg-emerald-900/95 py-1 shadow-lg backdrop-blur-md">
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => { setAddSeatsOpen(true); setQuickAddOpen(false); }}>
                    Add seats
                  </button>
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => { setAddSpaceOpen(true); setQuickAddOpen(false); }}>
                    Add space
                  </button>
                  <button type="button" className="block w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10" onClick={() => { setManageShiftsOpen(true); setQuickAddOpen(false); }}>
                    Manage shifts
                  </button>
                </div>
              ) : null}
            </div>
            <Button variant="outline" onClick={load} disabled={loading}>
              ↻ Refresh
            </Button>
            <Button variant="outline" onClick={() => exportSeatsCsv(filtered)}>
              Export
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" className="font-semibold underline" onClick={() => setError('')}>
            Dismiss
          </button>
        </div>
      ) : null}

      <GlassCard admin padding="md" className="space-y-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-primary">Seat map</p>
          <h2 className="font-display text-xl font-bold text-slate-900">Select seats</h2>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">🔍</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find student or seat…"
            className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { val: stats.total, lab: 'Total' },
            { val: stats.filled, lab: 'Filled' },
            { val: stats.vacant, lab: 'Vacant' },
            { val: stats.students, lab: 'Students' },
          ].map((s) => (
            <div key={s.lab} className="admin-card rounded-xl p-2.5 text-center">
              <p className="text-lg font-black text-slate-900">{s.val}</p>
              <p className="text-[10px] font-bold text-muted">{s.lab}</p>
            </div>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Shifts</p>
            <button type="button" className="text-xs font-bold text-primary" onClick={() => setManageShiftsOpen(true)}>
              Manage
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {shifts.length === 0 ? (
              <button type="button" className="shrink-0 rounded-full border border-dashed border-primary px-4 py-2 text-xs font-bold text-primary" onClick={handleCreateDefaultShifts}>
                + Create default shifts
              </button>
            ) : (
              shifts.map((shift) => (
                <button
                  key={shift.id}
                  type="button"
                  onClick={() => setSelectedShiftId(shift.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                    selectedShiftId === shift.id ? 'bg-primary text-white' : 'border border-white/20 bg-white/10 text-white'
                  }`}
                >
                  {shift.name}
                  <span className="ml-1 opacity-70">
                    {formatShiftTime(shift.startTime)}–{formatShiftTime(shift.endTime)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Spaces</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedSpaceId(null)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                !selectedSpaceId ? 'bg-white/20 text-white' : 'border border-white/20 bg-white/10 text-white/80'
              }`}
            >
              All Spaces
            </button>
            {spaces.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => setSelectedSpaceId(space.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${
                  selectedSpaceId === space.id ? 'bg-white/20 text-white' : 'border border-white/20 bg-white/10 text-white/80'
                }`}
              >
                {space.name}
              </button>
            ))}
            <button type="button" onClick={() => setAddSpaceOpen(true)} className="shrink-0 rounded-full border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-muted">
              + Space
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['all', 'vacant', 'occupied'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatusFilter(k)}
              className={`rounded-xl py-2 text-xs font-black capitalize ${
                statusFilter === k ? 'bg-primary/30 text-white' : 'border border-white/20 bg-white/10 text-white/80'
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <div className="admin-card flex flex-wrap gap-4 rounded-xl px-4 py-2.5 text-xs font-medium">
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Available
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-primary ring-1 ring-primary" /> Selected
          </span>
          <span className="flex items-center gap-2">
            <span className="h-3 w-3 rounded bg-rose-100 ring-1 ring-rose-300" /> Booked
          </span>
        </div>

        {!loading && seats.length === 0 ? (
          <AdminEmptyState
            icon="💺"
            title="No seats yet"
            description="Add a space, create shifts, then bulk-create seats like the mobile app."
            action={<Button onClick={() => setAddSeatsOpen(true)}>Add seats</Button>}
          />
        ) : (
          <SeatCardGrid
            seats={filtered}
            selectedId={activeSeat?.seatId}
            loading={loading}
            onSelect={onSeatPress}
            onAddSeats={() => setAddSeatsOpen(true)}
          />
        )}
      </GlassCard>

      <SeatAllocationModal
        open={assignOpen}
        seat={activeSeat}
        shiftName={activeShift?.name}
        students={students}
        busy={busy}
        onClose={() => { setAssignOpen(false); setActiveSeat(null); }}
        onConfirm={handleAssign}
      />

      {unassignTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <GlassCard admin padding="md" className="w-full max-w-sm">
            <h3 className="font-display text-lg font-bold">Unassign seat?</h3>
            <p className="mt-2 text-sm text-muted">
              Release seat #{unassignTarget.number} from <strong>{unassignTarget.student?.name}</strong> for this shift?
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUnassignTarget(null)}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={busy} onClick={handleUnassign}>
                {busy ? '…' : 'Unassign'}
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      <SeatShiftModals
        shifts={shifts}
        busy={busy}
        manageOpen={manageShiftsOpen}
        formOpen={shiftFormOpen}
        editingShift={editingShift}
        onCloseManage={() => setManageShiftsOpen(false)}
        onCloseForm={() => { setShiftFormOpen(false); setEditingShift(null); }}
        onOpenAdd={() => { setEditingShift(null); setShiftFormOpen(true); }}
        onOpenEdit={(s) => { setEditingShift(s); setShiftFormOpen(true); }}
        onDelete={handleDeleteShift}
        onCreateDefaults={handleCreateDefaultShifts}
        onSaveShift={handleSaveShift}
      />

      <SeatQuickAddModals
        addSeatsOpen={addSeatsOpen}
        addSpaceOpen={addSpaceOpen}
        totalSeats={totalSeatsInput}
        spaceName={spaceNameInput}
        busy={busy}
        onCloseSeats={() => setAddSeatsOpen(false)}
        onCloseSpace={() => setAddSpaceOpen(false)}
        onTotalChange={setTotalSeatsInput}
        onSpaceNameChange={setSpaceNameInput}
        onBulkCreate={handleBulkCreate}
        onCreateSpace={handleCreateSpace}
      />
    </div>
  );
}

function minutesToTime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
