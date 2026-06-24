const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");
const RenewalRequest = require("../models/RenewalRequest");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireNotExpiredSubscription } = require("../middleware/subscription.middleware");
const { computeMonthlyCollection } = require("../utils/monthlyCollection");

const router = express.Router();

/** DB stores enum lowercase; dashboard must not compare to legacy Title Case strings. */
function isFeeFullyPaid(status) {
  return String(status ?? "").trim().toLowerCase() === "paid";
}

function toDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getUtcDayRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function requireLibraryIdForAdmin(req, res) {
  // Multi-tenant security enforced
  if (req.user?.role === "admin") {
    const libraryId = String(req.query.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      res.status(400).json({ message: "libraryId is required for admin" });
      return null;
    }
    return libraryId;
  }
  return req.user?.libraryId;
}

/**
 * GET /api/dashboard
 *
 * Library-only SaaS dashboard aggregation.
 * - Uses token-scoped tenant id (req.user.libraryId)
 * - Avoids sending raw student PIN/password data
 * - Uses lean/select for performance
 */
router.get("/", requireAuth, requireRole("admin", "library"), requireNotExpiredSubscription, async (req, res) => {
  try {
    const libraryId = requireLibraryIdForAdmin(req, res);
    if (!libraryId) return;

    const nowDate = new Date();
    const todayKey = toDateKey(nowDate);
    const todayRange = getUtcDayRange(nowDate);
    const now = Date.now();

    // Multi-tenant isolation applied
    const [students, todayAttendanceCount, pendingRenewalCount] = await Promise.all([
      Student.find({ libraryId, isDeleted: false })
        .select("joinDate createdAt expiryDate isBlocked feeStatus feeAmount")
        .lean(),
      Attendance.countDocuments({
        libraryId,
        attendanceDate: { $gte: todayRange.start, $lt: todayRange.end },
      }),
      RenewalRequest.countDocuments({ libraryId, status: "pending" }),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter(
      (s) => !s.isBlocked && new Date(s.expiryDate).getTime() >= now
    ).length;
    const expiredStudents = students.filter((s) => new Date(s.expiryDate).getTime() < now).length;
    const blockedStudents = students.filter((s) => Boolean(s.isBlocked)).length;

    const feeDueStudents = students.filter((s) => !isFeeFullyPaid(s.feeStatus)).length;
    const totalFeeAmount = students.reduce((sum, s) => sum + (Number(s.feeAmount) || 0), 0);
    const dueAmount = students.reduce(
      (sum, s) => sum + (isFeeFullyPaid(s.feeStatus) ? 0 : (Number(s.feeAmount) || 0)),
      0
    );
    const collectedAmount = Math.max(0, totalFeeAmount - dueAmount);

    const { monthlyCollection, monthlyPaymentCount } = await computeMonthlyCollection(
      libraryId,
      students,
      nowDate
    );

    const attendancePct =
      totalStudents > 0 ? Math.round((todayAttendanceCount / totalStudents) * 100) : 0;

    return res.json({
      ok: true,
      libraryId: String(libraryId),
      students: {
        total: totalStudents,
        active: activeStudents,
        expired: expiredStudents,
        blocked: blockedStudents,
      },
      payments: {
        feeDueCount: feeDueStudents,
        collectedAmount,
        dueAmount,
        totalFeeAmount,
        monthlyCollection,
        monthlyPaymentCount,
      },
      attendance: {
        date: todayKey,
        todayCount: todayAttendanceCount,
        attendancePct,
      },
      renewalRequests: {
        pending: pendingRenewalCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load dashboard", error: error.message });
  }
});

module.exports = router;

