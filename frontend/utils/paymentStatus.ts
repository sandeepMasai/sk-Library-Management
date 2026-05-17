export type PaymentStatusKey = 'paid' | 'partial' | 'pending' | 'refunded';

export function normalizePaymentStatus(
  raw: string | undefined | null,
  opts?: { renewalRequestId?: string | null }
): PaymentStatusKey {
  const s = String(raw ?? '').trim().toLowerCase();
  if (s === 'refunded') return 'refunded';
  // Approved renewal payments are always completed charges in history.
  if (opts?.renewalRequestId) return 'paid';
  if (s === 'paid') return 'paid';
  if (s === 'partial' || s === 'half paid' || s === 'half_paid') return 'partial';
  if (s === 'pending') return 'pending';
  return 'paid';
}

export function paymentStatusLabel(
  raw: string | undefined | null,
  opts?: { renewalRequestId?: string | null }
): string {
  const key = normalizePaymentStatus(raw, opts);
  if (key === 'paid') return 'Paid';
  if (key === 'partial') return 'Partial';
  if (key === 'pending') return 'Pending';
  if (key === 'refunded') return 'Refunded';
  return 'Paid';
}

export function paymentStatusTone(key: PaymentStatusKey): 'paid' | 'partial' | 'pending' | 'other' {
  if (key === 'paid') return 'paid';
  if (key === 'partial') return 'partial';
  if (key === 'pending') return 'pending';
  return 'other';
}
