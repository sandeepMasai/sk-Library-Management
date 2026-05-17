const express = require("express");
const mongoose = require("mongoose");
const Shift = require("../models/Shift");
const RenewalRequest = require("../models/RenewalRequest");
const StudentPayment = require("../models/StudentPayment");
const Library = require("../models/Library");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { parseMembershipDays } = require("../utils/renewal");
const {
  createRenewalRequest,
  formatRequest,
  formatPayment,
  resolvePaymentDisplayStatus,
  getStudentSeatAndTiming,
} = require("../services/renewal.service");

const router = express.Router();

function parseStudentAuth(req, res) {
  const userId = String(req.user?.userId || "").trim();
  const libraryId = String(req.user?.libraryId || "").trim();
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
    res.status(400).json({ message: "Invalid auth payload" });
    return null;
  }
  return { userId, libraryId };
}

/**
 * GET /api/student/renew-dashboard
 * Single round-trip: renewal form context + request history.
 */
router.get("/renew-dashboard", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const auth = parseStudentAuth(req, res);
    if (!auth) return;
    const { userId, libraryId } = auth;

    const [shifts, seatTiming, library, requestRows] = await Promise.all([
      Shift.find({ libraryId }).select("name type startTime endTime").sort({ startTime: 1 }).lean(),
      getStudentSeatAndTiming(libraryId, userId),
      Library.findById(libraryId).select("name").lean(),
      RenewalRequest.find({ libraryId, studentId: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    return res.json({
      ok: true,
      libraryName: library?.name || "",
      seatNumber: seatTiming.seatNumber,
      currentTiming: seatTiming.currentTiming,
      currentShiftId: seatTiming.currentShiftId?.toString?.() || null,
      shifts: shifts.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      requests: requestRows.map(formatRequest),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load renewal dashboard", error: error.message });
  }
});

/**
 * GET /api/student/renew-context
 * Shifts + current seat/timing for renewal form.
 */
router.get("/renew-context", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const auth = parseStudentAuth(req, res);
    if (!auth) return;
    const { userId, libraryId } = auth;

    const [shifts, seatTiming, library] = await Promise.all([
      Shift.find({ libraryId }).select("name type startTime endTime").sort({ startTime: 1 }).lean(),
      getStudentSeatAndTiming(libraryId, userId),
      Library.findById(libraryId).select("name").lean(),
    ]);

    return res.json({
      ok: true,
      libraryName: library?.name || "",
      seatNumber: seatTiming.seatNumber,
      currentTiming: seatTiming.currentTiming,
      currentShiftId: seatTiming.currentShiftId?.toString?.() || null,
      shifts: shifts.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        type: s.type,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load renewal context", error: error.message });
  }
});

/**
 * POST /api/student/renew-request
 */
router.post("/renew-request", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }

    const { requestedDuration, requestedTiming, requestedShiftId, note } = req.body || {};
    const days = parseMembershipDays(requestedDuration);
    if (!requestedTiming && !requestedShiftId) {
      return res.status(400).json({ message: "requestedTiming or requestedShiftId is required" });
    }

    const request = await createRenewalRequest({
      libraryId,
      studentId: userId,
      requestedDuration: days,
      requestedTiming,
      requestedShiftId,
      note,
    });

    return res.status(201).json({ ok: true, request });
  } catch (error) {
    const code = error.statusCode || 500;
    return res.status(code).json({ message: error.message || "Failed to submit renewal request" });
  }
});

/**
 * GET /api/student/renew-requests
 */
router.get("/renew-requests", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const auth = parseStudentAuth(req, res);
    if (!auth) return;
    const { userId, libraryId } = auth;

    const rows = await RenewalRequest.find({ libraryId, studentId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ ok: true, requests: rows.map(formatRequest) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load renewal requests", error: error.message });
  }
});

/**
 * GET /api/student/payments
 */
router.get("/payments", requireAuth, requireRole("student"), async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");

    const auth = parseStudentAuth(req, res);
    if (!auth) return;
    const { userId, libraryId } = auth;

    const rows = await StudentPayment.find({ libraryId, studentId: userId })
      .select(
        "studentName amount durationDays paymentDate startDate expiryDate status feeMethod timing seatNumber invoiceNumber note renewalRequestId createdAt libraryId studentId"
      )
      .sort({ paymentDate: -1 })
      .limit(100)
      .lean();

    return res.json({ ok: true, payments: rows.map(formatPayment) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load payments", error: error.message });
  }
});

/**
 * GET /api/student/payments/:id/invoice
 */
router.get("/payments/:id/invoice", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();
    const paymentId = String(req.params.id || "").trim();

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(libraryId) ||
      !mongoose.Types.ObjectId.isValid(paymentId)
    ) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const [payment, library] = await Promise.all([
      StudentPayment.findOne({ _id: paymentId, libraryId, studentId: userId }).lean(),
      Library.findById(libraryId).select("name logoUrl address city state pincode phone").lean(),
    ]);

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (
      payment.renewalRequestId &&
      payment.status !== "paid" &&
      resolvePaymentDisplayStatus(payment) === "paid"
    ) {
      await StudentPayment.updateOne({ _id: payment._id }, { $set: { status: "paid" } });
      payment.status = "paid";
    }

    res.set("Cache-Control", "no-store");
    return res.json({
      ok: true,
      invoice: {
        ...formatPayment(payment),
        library: library
          ? {
              name: library.name,
              logoUrl: library.logoUrl || null,
              address: library.address || null,
              city: library.city || null,
              state: library.state || null,
              pincode: library.pincode || null,
              phone: library.phone || null,
            }
          : null,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load invoice", error: error.message });
  }
});

module.exports = router;
