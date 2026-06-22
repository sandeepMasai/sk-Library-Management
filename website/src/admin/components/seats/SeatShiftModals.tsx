import { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import type { ShiftRow } from '../../api/libraryApi';
import {
  formatShiftTime,
  minutesToTimeInput,
  SHIFT_TYPE_PRESETS,
  shiftSaveName,
  shiftTypeLabel,
  type ShiftTypeKey,
} from '../../utils/seatHelpers';

type SeatShiftModalsProps = {
  shifts: ShiftRow[];
  busy?: boolean;
  manageOpen: boolean;
  formOpen: boolean;
  editingShift: ShiftRow | null;
  onCloseManage: () => void;
  onCloseForm: () => void;
  onOpenAdd: () => void;
  onOpenEdit: (shift: ShiftRow) => void;
  onDelete: (id: string) => void;
  onCreateDefaults: () => void;
  onSaveShift: (payload: { name: string; type: string; startTime: string; endTime: string }) => void;
};

export function SeatShiftModals({
  shifts,
  busy,
  manageOpen,
  formOpen,
  editingShift,
  onCloseManage,
  onCloseForm,
  onOpenAdd,
  onOpenEdit,
  onDelete,
  onCreateDefaults,
  onSaveShift,
}: SeatShiftModalsProps) {
  const [shiftType, setShiftType] = useState<ShiftTypeKey | 'custom'>('morning');
  const [startTime, setStartTime] = useState('06:00');
  const [endTime, setEndTime] = useState('12:00');

  function applyPreset(type: ShiftTypeKey | 'custom') {
    setShiftType(type);
    if (type === 'custom') return;
    const p = SHIFT_TYPE_PRESETS[type];
    setStartTime(minutesToTimeInput(p.startMin));
    setEndTime(minutesToTimeInput(p.endMin));
  }

  function openFormWithShift(shift: ShiftRow | null) {
    if (shift) {
      setShiftType((shift.type as ShiftTypeKey) || 'custom');
      setStartTime(minutesToTimeInput(shift.startTime));
      setEndTime(minutesToTimeInput(shift.endTime));
    } else {
      applyPreset('morning');
    }
  }

  return (
    <>
      {manageOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <GlassCard admin padding="md" className="max-h-[85vh] w-full max-w-md overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">Manage shifts</h3>
              <button type="button" onClick={onCloseManage}>
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {shifts.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-muted">
                      {formatShiftTime(s.startTime)} – {formatShiftTime(s.endTime)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="text-xs font-bold text-primary" onClick={() => { openFormWithShift(s); onOpenEdit(s); }}>
                      Edit
                    </button>
                    <button type="button" className="text-xs font-bold text-red-600" onClick={() => onDelete(s.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button onClick={() => { openFormWithShift(null); onOpenAdd(); }}>Add shift</Button>
              <Button variant="outline" disabled={busy} onClick={onCreateDefaults}>
                Create default shifts
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {formOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <GlassCard admin padding="md" className="w-full max-w-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">{editingShift ? 'Edit shift' : 'Add shift'}</h3>
              <button type="button" onClick={onCloseForm}>
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Shift type</label>
                <select
                  value={shiftType}
                  onChange={(e) => applyPreset(e.target.value as ShiftTypeKey | 'custom')}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="morning">Morning (06:00–12:00)</option>
                  <option value="evening">Evening (14:00–20:00)</option>
                  <option value="full_day">Full Day (06:00–20:00)</option>
                  <option value="half_day">Half Day (16:00–20:00)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              {shiftType === 'custom' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  <Input label="End" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-muted">
                  Fixed hours: {startTime} – {endTime} ({shiftTypeLabel(shiftType)})
                </p>
              )}
              <Button
                className="w-full"
                disabled={busy}
                onClick={() => {
                  const [sh, sm] = startTime.split(':').map(Number);
                  const [eh, em] = endTime.split(':').map(Number);
                  const startMin = sh * 60 + sm;
                  const endMin = eh * 60 + em;
                  onSaveShift({
                    name: shiftSaveName(shiftType, startMin, endMin),
                    type: shiftType,
                    startTime: `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
                    endTime: `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
                  });
                }}
              >
                {busy ? 'Saving…' : 'Save shift'}
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
}

type QuickAddModalsProps = {
  addSeatsOpen: boolean;
  addSpaceOpen: boolean;
  totalSeats: string;
  spaceName: string;
  spaceSeatCount: string;
  selectedSpaceLabel?: string;
  busy?: boolean;
  onCloseSeats: () => void;
  onCloseSpace: () => void;
  onTotalChange: (v: string) => void;
  onSpaceNameChange: (v: string) => void;
  onSpaceSeatCountChange: (v: string) => void;
  onBulkCreate: () => void;
  onCreateSpace: () => void;
};

export function SeatQuickAddModals({
  addSeatsOpen,
  addSpaceOpen,
  totalSeats,
  spaceName,
  spaceSeatCount,
  selectedSpaceLabel,
  busy,
  onCloseSeats,
  onCloseSpace,
  onTotalChange,
  onSpaceNameChange,
  onSpaceSeatCountChange,
  onBulkCreate,
  onCreateSpace,
}: QuickAddModalsProps) {
  return (
    <>
      {addSeatsOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <GlassCard admin padding="md" className="w-full max-w-sm">
            <h3 className="mb-4 font-display text-lg font-bold">Add seats</h3>
            <Input
              label={selectedSpaceLabel ? `Seats to add in ${selectedSpaceLabel}` : 'Total seats (1..N)'}
              type="number"
              min={1}
              max={5000}
              value={totalSeats}
              onChange={(e) => onTotalChange(e.target.value)}
            />
            <p className="mt-2 text-xs text-muted">
              {selectedSpaceLabel
                ? `Creates new numbered seats assigned to ${selectedSpaceLabel}.`
                : 'Creates numbered seats 1 to N for the whole library (fills missing numbers only).'}
            </p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCloseSeats}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={busy} onClick={onBulkCreate}>
                {busy ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}

      {addSpaceOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
          <GlassCard admin padding="md" className="w-full max-w-sm">
            <h3 className="mb-4 font-display text-lg font-bold">Add space</h3>
            <Input label="Hall / room name" value={spaceName} onChange={(e) => onSpaceNameChange(e.target.value)} placeholder="Hall A" />
            <div className="mt-3">
              <Input
                label="Seats in this hall"
                type="number"
                min={1}
                max={5000}
                value={spaceSeatCount}
                onChange={(e) => onSpaceSeatCountChange(e.target.value)}
              />
            </div>
            <p className="mt-2 text-xs text-muted">Creates the hall and numbered seats inside it (e.g. 40 seats for Hall A).</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onCloseSpace}>
                Cancel
              </Button>
              <Button className="flex-1" disabled={busy} onClick={onCreateSpace}>
                {busy ? 'Saving…' : 'Create'}
              </Button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </>
  );
}
