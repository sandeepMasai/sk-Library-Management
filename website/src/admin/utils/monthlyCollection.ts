import type { StudentPaymentRow, StudentRow } from '../api/libraryApi';

export type MonthlyFeeItem = {
  id: string;
  studentName: string;
  amount: number;
  type: 'admission' | 'renewal';
  date: string | null;
  label: string;
};

function isFeeCollected(status?: string) {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'paid' || s === 'partial' || s === 'half paid';
}

export function getIstMonthRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type === 'year' || p.type === 'month') acc[p.type] = p.value;
      return acc;
    }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00+05:30`);
  return { start, end };
}

function inRange(iso: string | null | undefined, start: Date, end: Date) {
  if (!iso) return false;
  const d = new Date(iso);
  return !Number.isNaN(d.getTime()) && d >= start && d < end;
}

function paymentType(payment: StudentPaymentRow): 'admission' | 'renewal' {
  if (payment.renewalRequestId) return 'renewal';
  const note = String(payment.note || '').toLowerCase();
  if (note.includes('renewal')) return 'renewal';
  return 'admission';
}

function formatItemDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Build per-student fee rows for the current IST month (admission + renewal). */
export function buildMonthlyCollectionItems(
  students: StudentRow[],
  payments: StudentPaymentRow[]
): MonthlyFeeItem[] {
  const { start, end } = getIstMonthRange();
  const items: MonthlyFeeItem[] = [];

  for (const payment of payments) {
    const status = String(payment.status || '').toLowerCase();
    if (status !== 'paid' && status !== 'partial') continue;
    const date = payment.paymentDate || payment.createdAt || null;
    if (!inRange(date, start, end)) continue;

    const type = paymentType(payment);
    items.push({
      id: payment.id,
      studentName: payment.studentName || 'Student',
      amount: Number(payment.amount) || 0,
      type,
      date,
      label: type === 'renewal' ? 'Plan renew' : 'New admission',
    });
  }

  const hasAdmissionPayment = new Set(
    payments.filter((p) => !p.renewalRequestId).map((p) => p.studentId).filter(Boolean)
  );

  for (const student of students) {
    if (!isFeeCollected(student.feeStatus)) continue;
    if (hasAdmissionPayment.has(student.id)) continue;

    const addedThisMonth =
      inRange(student.createdAt, start, end) || inRange(student.joinDate, start, end);
    if (!addedThisMonth) continue;

    const date = student.createdAt || student.joinDate || null;
    items.push({
      id: `admission-${student.id}`,
      studentName: student.name,
      amount: Number(student.feeAmount) || 0,
      type: 'admission',
      date,
      label: 'New admission',
    });
    hasAdmissionPayment.add(student.id);
  }

  return items.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });
}

export function sumMonthlyCollectionItems(items: MonthlyFeeItem[]) {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

/** Client fallback when API monthlyCollection is missing or zero. */
export function computeMonthlyCollectionFallback(
  students: StudentRow[],
  payments: StudentPaymentRow[]
): number {
  return sumMonthlyCollectionItems(buildMonthlyCollectionItems(students, payments));
}

export { formatItemDate };
