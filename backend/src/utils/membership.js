function toUtcStartOfDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Active paid membership: not blocked/deleted, feeStatus paid, expiry on or after today (UTC day).
 */
function isActiveMemberForAttendance(student, now = new Date()) {
  if (!student || student.isDeleted) {
    return { ok: false, reason: "not_found" };
  }
  if (Boolean(student.isBlocked)) {
    return { ok: false, reason: "blocked" };
  }
  const fee = String(student.feeStatus || "").trim().toLowerCase();
  if (fee !== "paid") {
    return { ok: false, reason: "unpaid" };
  }
  if (!student.expiryDate) {
    return { ok: true };
  }
  const expiryDay = toUtcStartOfDay(student.expiryDate);
  const todayDay = toUtcStartOfDay(now);
  if (!expiryDay || !todayDay || expiryDay.getTime() < todayDay.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

module.exports = { toUtcStartOfDay, isActiveMemberForAttendance };
