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
    <section className="admin-card rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="student-drawer admin-card relative flex h-full w-full max-w-2xl flex-col overflow-hidden shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-primary/5 to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              {loading ? (
                <div className="admin-skeleton h-16 w-16 rounded-2xl" />
              ) : student?.photoUrl ? (
                <img src={student.photoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-md" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                  {student?.name?.charAt(0).toUpperCase() || '👤'}
                </span>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Student profile</p>
                <h2 className="font-display text-xl font-bold text-slate-900">{loading ? 'Loading…' : student?.name}</h2>
                {student ? (
                  <p className="text-sm text-muted">
                    {studentDisplayId(student)} · @{student.username}
                  </p>
                ) : null}
              </div>
            </div>
            <button type="button" className="rounded-lg p-2 text-muted hover:bg-slate-100" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === t.id ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
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
                <button type="button" onClick={() => setTab('fees')} className="mt-2 text-sm font-semibold text-primary">
                  View payment history →
                </button>
              </Section>

              <Section title="Attendance">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50 p-3 text-center">
                    <p className="text-xs text-muted">Today</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {attendance.some((a) => a.date.startsWith(new Date().toISOString().slice(0, 10)))
                        ? 'Present'
                        : 'Absent'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-3 text-center">
                    <p className="text-xs text-muted">Monthly</p>
                    <p className="text-lg font-bold text-blue-700">{attendancePct}%</p>
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
                          <p className="font-medium text-slate-900">{item.label}</p>
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

                <div className="mt-4 flex flex-wrap gap-2">
                  {MEMBERSHIP_DAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setForm({ ...form, membershipDays: d })}
                      className={`rounded-xl border px-3 py-1.5 text-sm ${
                        form.membershipDays === d ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200'
                      }`}
                    >
                      {d} days
                    </button>
                  ))}
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
              <Section title="Fee summary">
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-muted">Status</dt><dd className="font-semibold">{student.feeStatus}</dd></div>
                  <div><dt className="text-muted">Amount due</dt><dd className="font-semibold">₹{student.feeAmount}</dd></div>
                  <div><dt className="text-muted">Total paid</dt><dd className="font-semibold text-primary">₹{fees.totalPaid}</dd></div>
                  <div><dt className="text-muted">Pending</dt><dd className="font-semibold text-amber-600">₹{fees.pending}</dd></div>
                </dl>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setTab('edit')}>
                  Collect / update fee
                </Button>
              </Section>

              <Section title="Payment history">
                {payments.length === 0 ? (
                  <p className="text-sm text-muted">No payments recorded yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-50">
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
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-muted">This month</p>
                    <p className="text-2xl font-bold text-primary">{attendancePct}%</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <p className="text-xs text-muted">Days present</p>
                    <p className="text-2xl font-bold">{attendance.length}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-center">
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
                        className={`w-full max-w-[2rem] rounded-t-lg ${day.present ? 'bg-emerald-500' : 'bg-slate-200'}`}
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
                      <div key={row.date} className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 text-center text-xs">
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
                  <img src={student.photoUrl} alt="" className="mt-2 max-h-40 rounded-xl border" />
                </div>
              ) : null}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
