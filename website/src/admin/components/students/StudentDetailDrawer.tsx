import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  approveRenewalRequest,
  deleteStudent,
  fetchRenewalRequests,
  fetchStudentAttendance,
  fetchStudentById,
  fetchStudentPayments,
  toggleBlockStudent,
  updateStudent,
  uploadStudentPhoto,
  type RenewalRequestRow,
  type SeatRow,
  type StudentAttendanceDay,
  type StudentPaymentRow,
  type StudentRow,
} from '../../api/libraryApi';
import {
  buildStudentTimeline,
  deriveMembershipDays,
  deriveMembershipPlan,
  feeSummary,
  formatExpiry,
  getStudentStatus,
  statusBadge,
  studentDisplayId,
} from '../../utils/studentHelpers';

const MEMBERSHIP_DAYS = [30, 90, 180, 365] as const;

const MEMBERSHIP_DAY_STYLES: Record<
  (typeof MEMBERSHIP_DAYS)[number],
  { active: string; idle: string; dot: string }
> = {
  30: {
    active: 'border-sky-400/70 bg-sky-500/30 text-white shadow-md shadow-sky-900/30 ring-1 ring-sky-300/50',
    idle: 'border-white/15 text-white/75 hover:border-sky-400/40 hover:bg-sky-500/10',
    dot: 'bg-sky-400',
  },
  90: {
    active: 'border-teal-400/70 bg-teal-500/30 text-white shadow-md shadow-teal-900/30 ring-1 ring-teal-300/50',
    idle: 'border-white/15 text-white/75 hover:border-teal-400/40 hover:bg-teal-500/10',
    dot: 'bg-teal-400',
  },
  180: {
    active: 'border-amber-400/70 bg-amber-500/30 text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-300/50',
    idle: 'border-white/15 text-white/75 hover:border-amber-400/40 hover:bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  365: {
    active: 'border-violet-400/70 bg-violet-500/30 text-white shadow-md shadow-violet-900/30 ring-1 ring-violet-300/50',
    idle: 'border-white/15 text-white/75 hover:border-violet-400/40 hover:bg-violet-500/10',
    dot: 'bg-violet-400',
  },
};

const FEE_STATUS_OPTIONS: {
  value: (typeof FEE_STATUSES)[number];
  label: string;
  hint: string;
  icon: string;
  active: string;
  idle: string;
}[] = [
  {
    value: 'Paid',
    label: 'Full',
    hint: 'Fully paid',
    icon: '✓',
    active: 'border-emerald-400/70 bg-emerald-500/30 text-white shadow-md shadow-emerald-900/30 ring-1 ring-emerald-300/50',
    idle: 'border-white/15 text-white/75 hover:border-emerald-400/40 hover:bg-emerald-500/10',
  },
  {
    value: 'Half Paid',
    label: 'Half',
    hint: 'Partial paid',
    icon: '◐',
    active: 'border-amber-400/70 bg-amber-500/30 text-white shadow-md shadow-amber-900/30 ring-1 ring-amber-300/50',
    idle: 'border-white/15 text-white/75 hover:border-amber-400/40 hover:bg-amber-500/10',
  },
  {
    value: 'Pending',
    label: 'Pending',
    hint: 'Not paid',
    icon: '○',
    active: 'border-rose-400/70 bg-rose-500/30 text-white shadow-md shadow-rose-900/30 ring-1 ring-rose-300/50',
    idle: 'border-white/15 text-white/75 hover:border-rose-400/40 hover:bg-rose-500/10',
  },
];

const FEE_METHOD_OPTIONS = [
  { value: 'cash' as const, label: 'Cash', icon: '💵' },
  { value: 'upi' as const, label: 'UPI', icon: '📱' },
];
const FEE_STATUSES = ['Paid', 'Half Paid', 'Pending'] as const;

type DrawerTab = 'overview' | 'edit' | 'fees' | 'attendance' | 'seat' | 'messages';

type StudentDetailDrawerProps = {
  studentId: string;
  seat?: SeatRow | null;
  seatLabel?: string | null;
  seatShiftName?: string | null;
  libraryName?: string;
  onClose: () => void;
  onUpdated: () => void;
  onMessage: () => void;
  initialTab?: DrawerTab;
};

type FormState = {
  name: string;
  mobile: string;
  username: string;
  pin: string;
  joinDate: string;
  membershipDays: (typeof MEMBERSHIP_DAYS)[number];
  feeAmount: string;
  feeStatus: (typeof FEE_STATUSES)[number];
  feeMethod: 'cash' | 'upi';
};

function toForm(student: StudentRow): FormState {
  return {
    name: student.name || '',
    mobile: student.mobile || '',
    username: student.username || '',
    pin: '',
    joinDate: student.joinDate ? student.joinDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    membershipDays: deriveMembershipDays(student.joinDate, student.expiryDate),
    feeAmount: String(student.feeAmount ?? ''),
    feeStatus: (FEE_STATUSES.includes(student.feeStatus as (typeof FEE_STATUSES)[number])
      ? student.feeStatus
      : 'Pending') as (typeof FEE_STATUSES)[number],
    feeMethod: student.feeMethod === 'upi' ? 'upi' : 'cash',
  };
}

function daysUntilExpiry(expiryDate?: string) {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="student-drawer-section admin-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function StudentDetailDrawer({
  studentId,
  seat,
  seatLabel,
  seatShiftName,
  libraryName,
  onClose,
  onUpdated,
  onMessage,
  initialTab = 'overview',
}: StudentDetailDrawerProps) {
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [attendance, setAttendance] = useState<StudentAttendanceDay[]>([]);
  const [payments, setPayments] = useState<StudentPaymentRow[]>([]);
  const [renewals, setRenewals] = useState<RenewalRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feeSaving, setFeeSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [renewalBusy, setRenewalBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [row, att, pay, renewalRes] = await Promise.all([
        fetchStudentById(studentId),
        fetchStudentAttendance(studentId),
        fetchStudentPayments(studentId),
        fetchRenewalRequests('all'),
      ]);
      if (!row) {
        setError('Student not found');
        setStudent(null);
        return;
      }
      setStudent(row);
      setForm(toForm(row));
      setAttendance(att);
      setPayments(pay);
      setRenewals(renewalRes.requests.filter((r) => r.studentId === studentId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    setTab(initialTab);
  }, [studentId, initialTab]);

  const badge = useMemo(() => (student ? statusBadge(student) : null), [student]);
  const daysLeft = useMemo(() => daysUntilExpiry(student?.expiryDate), [student?.expiryDate]);
  const fees = useMemo(
    () => (student ? feeSummary(student, payments) : { totalPaid: 0, pending: 0, last: undefined }),
    [student, payments]
  );
  const timeline = useMemo(
    () =>
      student
        ? buildStudentTimeline(student, payments, renewals, attendance.length)
        : [],
    [student, payments, renewals, attendance]
  );
  const attendancePct = useMemo(() => {
    const elapsed = new Date().getDate();
    if (elapsed <= 0) return 0;
    return Math.min(100, Math.round((attendance.length / elapsed) * 100));
  }, [attendance]);
  const weekTrend = useMemo(() => {
    const days: { label: string; present: boolean }[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      days.push({
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3),
        present: attendance.some((a) => a.date.startsWith(key)),
      });
    }
    return days;
  }, [attendance]);
  const pendingRenewal = renewals.find((r) => r.status === 'pending');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !student) return;

    const mobile = form.mobile.replace(/\D/g, '').slice(-10);
    if (!/^\d{10}$/.test(mobile)) {
      setError('Mobile must be exactly 10 digits');
      return;
    }
    const username = form.username.trim().toLowerCase();
    if (!username || username.length < 2) {
      setError('Username is required');
      return;
    }
    if (form.pin && !/^\d{4}$/.test(form.pin)) {
      setError('PIN must be 4 digits');
      return;
    }
    const feeNum = Number(form.feeAmount);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setError('Enter a valid fee amount');
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const joinIso =
      form.joinDate === todayStr ? new Date().toISOString() : new Date(`${form.joinDate}T12:00:00`).toISOString();

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateStudent(student.id, {
        name: form.name.trim(),
        mobile,
        username,
        ...(form.pin ? { pin: form.pin } : {}),
        joinDate: joinIso,
        membershipDays: form.membershipDays,
        feeAmount: feeNum,
        feeStatus: form.feeStatus,
        feeMethod: form.feeMethod,
      });
      setStudent(updated);
      setForm(toForm(updated));
      setSuccess('Saved successfully.');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleFeeSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form || !student) return;

    const feeNum = Number(form.feeAmount);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setError('Enter a valid fee amount');
      return;
    }

    setFeeSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateStudent(student.id, {
        feeAmount: feeNum,
        feeStatus: form.feeStatus,
        feeMethod: form.feeMethod,
      });
      setStudent(updated);
      setForm(toForm(updated));
      setSuccess('Fee updated successfully.');
      onUpdated();
      const pay = await fetchStudentPayments(student.id);
      setPayments(pay);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fee update failed');
    } finally {
      setFeeSaving(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !student) return;
    setUploading(true);
    try {
      const updated = await uploadStudentPhoto(student.id, file);
      setStudent(updated);
      setSuccess('Photo updated.');
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'edit', label: 'Edit' },
    { id: 'fees', label: 'Fees' },
    { id: 'attendance', label: 'Attendance' },
    { id: 'seat', label: 'Seat' },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <div className="student-drawer-overlay fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="student-drawer admin-card relative flex h-full w-full max-w-2xl flex-col overflow-hidden shadow-2xl">
        <div className="student-drawer-header border-b border-white/10 bg-white/5 px-5 py-4 backdrop-blur-md">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="admin-skeleton h-16 w-16 rounded-2xl" />
              ) : student?.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-md ring-1 ring-white/15" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20 text-2xl font-bold text-primary">
                  {student?.name?.charAt(0).toUpperCase() || '👤'}
                </span>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Student profile</p>
                <h2 className="font-display text-xl font-bold text-white">{loading ? 'Loading…' : student?.name}</h2>
                {student ? (
                  <p className="text-sm text-muted">
                    {studentDisplayId(student)} · @{student.username}
                  </p>
                ) : null}
              </div>
            </div>
            <button type="button" className="rounded-lg p-2 text-muted hover:bg-white/10 hover:text-white" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="student-drawer-body flex-1 overflow-y-auto bg-transparent p-5">
          {loading ? (
            <div className="space-y-4">
              <div className="admin-skeleton h-32 rounded-2xl" />
              <div className="admin-skeleton h-48 rounded-2xl" />
              <div className="admin-skeleton h-32 rounded-2xl" />
            </div>
          ) : !student || !form ? (
            <p className="text-sm text-red-600">{error || 'Student not found'}</p>
          ) : tab === 'overview' ? (
            <div className="space-y-4">
              {badge ? (
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                  {badge.label}
                </span>
              ) : null}

              <Section title="Profile">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Phone</dt><dd className="font-medium">{student.mobile}</dd></div>
                  <div><dt className="text-muted">Username</dt><dd className="font-medium">@{student.username}</dd></div>
                  <div><dt className="text-muted">Join date</dt><dd className="font-medium">{formatExpiry(student.joinDate)}</dd></div>
                  <div><dt className="text-muted">Library</dt><dd className="font-medium">{libraryName || '—'}</dd></div>
                </dl>
              </Section>

              <Section title="Membership">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Current plan</dt><dd className="font-medium">{deriveMembershipPlan(student.joinDate, student.expiryDate)}</dd></div>
                  <div><dt className="text-muted">Start date</dt><dd className="font-medium">{formatExpiry(student.joinDate)}</dd></div>
                  <div><dt className="text-muted">End date</dt><dd className="font-medium">{formatExpiry(student.expiryDate)}</dd></div>
                  <div>
                    <dt className="text-muted">Days remaining</dt>
                    <dd className={`font-medium ${daysLeft != null && daysLeft < 0 ? 'text-rose-600' : ''}`}>
                      {daysLeft != null ? (daysLeft < 0 ? `${Math.abs(daysLeft)} overdue` : daysLeft) : '—'}
                    </dd>
                  </div>
                </dl>
                {pendingRenewal ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={renewalBusy}
                      onClick={async () => {
                        setRenewalBusy(true);
                        try {
                          await approveRenewalRequest(pendingRenewal.id);
                          await load();
                          onUpdated();
                        } finally {
                          setRenewalBusy(false);
                        }
                      }}
                    >
                      Approve renewal
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setTab('edit')}>
                    Renew membership
                  </Button>
                )}
              </Section>

              <Section title="Fees snapshot">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Total fees paid</dt><dd className="font-bold text-primary">₹{fees.totalPaid}</dd></div>
                  <div><dt className="text-muted">Pending fees</dt><dd className="font-bold text-amber-600">₹{fees.pending}</dd></div>
                  <div><dt className="text-muted">Last payment</dt><dd className="font-medium">₹{fees.last?.amount ?? student.feeAmount}</dd></div>
                  <div><dt className="text-muted">Payment date</dt><dd className="font-medium">{formatExpiry(fees.last?.paymentDate || undefined)}</dd></div>
                </dl>
                <button type="button" onClick={() => setTab('fees')} className="mt-2 text-sm font-semibold text-white hover:text-white/80">
                  View payment history →
                </button>
              </Section>

              <Section title="Attendance">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-center">
                    <p className="text-xs text-muted">Today</p>
                    <p className="text-lg font-bold text-emerald-300">
                      {attendance.some((a) => a.date.startsWith(new Date().toISOString().slice(0, 10)))
                        ? 'Present'
                        : 'Absent'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-center">
                    <p className="text-xs text-muted">Monthly</p>
                    <p className="text-lg font-bold text-sky-300">{attendancePct}%</p>
                  </div>
                </div>
              </Section>

              <Section title="Activity timeline">
                {timeline.length === 0 ? (
                  <p className="text-sm text-muted">No activity yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {timeline.slice(0, 8).map((item, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="text-lg">{item.icon}</span>
                        <div>
                          <p className="font-medium text-white">{item.label}</p>
                          <p className="text-xs text-muted">{formatExpiry(item.date)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          ) : tab === 'edit' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <Section title="Edit student">
                <label className="group relative mb-4 inline-block cursor-pointer">
                  {student.photoUrl ? (
                    <img src={student.photoUrl} alt="" className="h-20 w-20 rounded-2xl object-cover" />
                  ) : (
                    <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                      {student.name.charAt(0)}
                    </span>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/50 text-[10px] text-white opacity-0 group-hover:opacity-100">
                    {uploading ? '…' : 'Change photo'}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Full name *" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <Input label="Mobile *" required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  <Input label="Username *" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                  <Input label="New PIN" maxLength={4} value={form.pin} hint="Optional" onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                  <Input label="Join date *" type="date" required value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
                  <Input label="Fee (₹) *" type="number" required value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} />
                </div>

                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Select membership days</p>
                  <div className="flex flex-wrap gap-2">
                    {MEMBERSHIP_DAYS.map((d) => {
                      const selected = form.membershipDays === d;
                      const tone = MEMBERSHIP_DAY_STYLES[d];
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm({ ...form, membershipDays: d })}
                          className={`inline-flex min-w-[5.5rem] items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            selected ? tone.active : tone.idle
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${selected ? tone.dot : 'bg-white/25'}`} aria-hidden />
                          {d} days
                        </button>
                      );
                    })}
                  </div>
                </div>
              </Section>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
                <Button type="button" variant="outline" onClick={async () => { await toggleBlockStudent(student.id); await load(); onUpdated(); }}>
                  {student.isBlocked ? 'Unblock' : 'Block'}
                </Button>
                <Button type="button" variant="outline" className="text-red-600" onClick={async () => {
                  if (!confirm(`Delete ${student.name}?`)) return;
                  await deleteStudent(student.id);
                  onUpdated();
                  onClose();
                }}>
                  Delete
                </Button>
              </div>
            </form>
          ) : tab === 'fees' ? (
            <div className="space-y-4">
              <form onSubmit={handleFeeSave}>
                <Section title="Collect / update fee">
                  <Input
                    dark
                    label="Fee amount (₹)"
                    type="number"
                    required
                    min={0}
                    value={form.feeAmount}
                    onChange={(e) => setForm({ ...form, feeAmount: e.target.value })}
                    placeholder="Enter fee amount"
                  />

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Fee status</p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {FEE_STATUS_OPTIONS.map((option) => {
                        const selected = form.feeStatus === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setForm({ ...form, feeStatus: option.value })}
                            className={`flex flex-col items-start rounded-xl border px-3 py-3 text-left transition ${
                              selected ? option.active : option.idle
                            }`}
                          >
                            <span className="text-base leading-none" aria-hidden>
                              {option.icon}
                            </span>
                            <span className="mt-2 text-sm font-bold">{option.label}</span>
                            <span className="mt-0.5 text-[11px] text-white/65">{option.hint}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Payment method</p>
                    <div className="flex flex-wrap gap-2">
                      {FEE_METHOD_OPTIONS.map((method) => {
                        const selected = form.feeMethod === method.value;
                        return (
                          <button
                            key={method.value}
                            type="button"
                            onClick={() => setForm({ ...form, feeMethod: method.value })}
                            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${
                              selected
                                ? 'border-primary bg-primary/25 text-white ring-1 ring-primary/40'
                                : 'border-white/15 text-white/75 hover:bg-white/5'
                            }`}
                          >
                            <span aria-hidden>{method.icon}</span>
                            {method.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
                  {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

                  <Button type="submit" className="mt-4" disabled={feeSaving}>
                    {feeSaving ? 'Saving fee…' : 'Save fee'}
                  </Button>
                </Section>
              </form>

              <Section title="Fee summary">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Status</dt><dd className="font-semibold text-white">{student.feeStatus}</dd></div>
                  <div><dt className="text-muted">Amount due</dt><dd className="font-semibold text-white">₹{student.feeAmount}</dd></div>
                  <div><dt className="text-muted">Total paid</dt><dd className="font-semibold text-emerald-300">₹{fees.totalPaid}</dd></div>
                  <div><dt className="text-muted">Pending</dt><dd className="font-semibold text-amber-300">₹{fees.pending}</dd></div>
                </dl>
              </Section>

              <Section title="Payment history">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted">No payments recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-white/10">
                    {payments.map((p) => (
                      <li key={p.id} className="flex justify-between py-3 text-sm">
                        <div>
                          <p className="font-medium">₹{p.amount}</p>
                          <p className="text-xs text-muted">{p.durationLabel || p.status} · {formatExpiry(p.paymentDate || undefined)}</p>
                        </div>
                        <span className="text-xs uppercase text-muted">{p.feeMethod || 'cash'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          ) : tab === 'attendance' ? (
            <div className="space-y-4">
              <Section title="Attendance overview">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-muted">This month</p>
                    <p className="text-2xl font-bold text-primary">{attendancePct}%</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-muted">Days present</p>
                    <p className="text-2xl font-bold text-white">{attendance.length}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
                    <p className="text-xs text-muted">Status</p>
                    <p className="text-lg font-bold capitalize">{getStudentStatus(student)}</p>
                  </div>
                </div>
              </Section>

              <Section title="Weekly chart">
                <div className="flex h-28 items-end justify-between gap-2">
                  {weekTrend.map((day) => (
                    <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className={`w-full max-w-[2rem] rounded-t-lg ${day.present ? 'bg-emerald-500' : 'bg-white/15'}`}
                        style={{ height: day.present ? '80%' : '20%' }}
                      />
                      <span className="text-[10px] text-muted">{day.label}</span>
                    </div>
                  ))}
                </div>
              </Section>

              <Section title="Monthly log">
                {attendance.length === 0 ? (
                  <p className="text-sm text-muted">No check-ins this month.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {attendance.map((row) => (
                      <div key={row.date} className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2 py-2 text-center text-xs text-emerald-100">
                        {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>
          ) : tab === 'seat' ? (
            <Section title="Seat assignment">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Seat number</dt><dd className="font-bold text-lg">{seat?.number ?? '—'}</dd></div>
                <div><dt className="text-muted">Seat label</dt><dd className="font-medium">{seatLabel?.trim() || seat?.label?.trim() || '—'}</dd></div>
                <div><dt className="text-muted">Shift</dt><dd className="font-medium">{seatShiftName || '—'}</dd></div>
                <div><dt className="text-muted">Seat status</dt><dd className="font-medium capitalize">{seat ? 'occupied' : 'unassigned'}</dd></div>
              </dl>
              <Link to="/admin/seats" className="mt-4 inline-block">
                <Button variant="outline">Change seat</Button>
              </Link>
            </Section>
          ) : (
            <Section title="Communication">
              <p className="text-sm text-muted">Send fee reminders, expiry alerts, or custom messages.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={onMessage}>Send message</Button>
                <Button variant="outline" onClick={() => { onMessage(); }}>
                  Fee reminder
                </Button>
                <Button variant="outline" onClick={() => { onMessage(); }}>
                  Expiry reminder
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted">
                Documents (ID proof, admission form) are managed in the SmartLibDesk mobile app.
              </p>
              {student.photoUrl ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold text-muted">Student photo</p>
                  <img src={student.photoUrl} alt="" className="mt-2 max-h-40 rounded-xl border border-white/15" />
                </div>
              ) : null}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
