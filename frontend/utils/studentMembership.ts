import { differenceInDays } from 'date-fns';
import type { User } from '../store';

/** Paid + not expired (calendar day) + not blocked. */
export function isStudentMembershipActiveForAttendance(user: User | null | undefined): boolean {
  if (!user || user.isBlocked) return false;
  const fee = String(user.feeStatus || '').trim().toLowerCase();
  if (fee !== 'paid') return false;
  if (!user.expiryDate) return true;
  return differenceInDays(new Date(user.expiryDate), new Date()) >= 0;
}

export function membershipExpiryLabel(user: User | null | undefined): string {
  if (!user?.expiryDate) return '—';
  const d = new Date(user.expiryDate);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
