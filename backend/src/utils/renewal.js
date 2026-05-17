function addDays(date, days) {
  const n = Math.max(1, Number(days || 30));
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function parseMembershipDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  if ([30, 90, 180, 365].includes(Math.round(n))) return Math.round(n);
  return 30;
}

/**
 * If plan still active, extend from current expiry; otherwise from today.
 */
function computeRenewalExpiry(currentExpiryDate, durationDays) {
  const now = new Date();
  const currentMs = currentExpiryDate ? new Date(currentExpiryDate).getTime() : 0;
  const base =
    Number.isFinite(currentMs) && currentMs > now.getTime()
      ? new Date(currentMs)
      : now;
  const newExpiry = addDays(base, parseMembershipDays(durationDays));
  return { startDate: base, expiryDate: newExpiry };
}

function durationLabel(days) {
  const n = Number(days);
  if (n === 30) return "1 Month";
  if (n === 90) return "3 Months";
  if (n === 180) return "6 Months";
  if (n === 365) return "1 Year";
  return `${n} Days`;
}

function generateInvoiceNumber(libraryId, studentId) {
  const ts = Date.now().toString(36).toUpperCase();
  const lib = String(libraryId || "").slice(-4).toUpperCase();
  const stu = String(studentId || "").slice(-4).toUpperCase();
  return `INV-${lib}${stu}-${ts}`;
}

module.exports = {
  addDays,
  parseMembershipDays,
  computeRenewalExpiry,
  durationLabel,
  generateInvoiceNumber,
};
