const express = require("express");
const mongoose = require("mongoose");
const RenewalRequest = require("../models/RenewalRequest");
const StudentPayment = require("../models/StudentPayment");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireNotExpiredSubscription } = require("../middleware/subscription.middleware");
const {
  formatRequest,
  formatPayment,
  approveRenewalRequest,
  rejectRenewalRequest,
} = require("../services/renewal.service");

const router = express.Router();

function requireLibraryId(req, res) {
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
 * GET /api/library/renew-requests
 * Query: status=pending|approved|rejected|all
 */
router.get(
  "/renew-requests",
  requireAuth,
  requireRole("admin", "library"),
  requireNotExpiredSubscription,
  async (req, res) => {
    try {
      const libraryId = requireLibraryId(req, res);
      if (!libraryId) return;

      const status = String(req.query.status || "pending").trim().toLowerCase();
      const filter = { libraryId };
      if (status !== "all") {
        filter.status = status;
      }

      const rows = await RenewalRequest.find(filter).sort({ createdAt: -1 }).limit(200).lean();

      const pendingCount = await RenewalRequest.countDocuments({
        libraryId,
        status: "pending",
      });

      return res.json({
        ok: true,
        pendingCount,
        requests: rows.map(formatRequest),
      });
    } catch (error) {
      return res.status(500).json({ message: "Failed to load renewal requests", error: error.message });
    }
  }
);

/**
 * GET /api/library/student-payments
 */
router.get(
  "/student-payments",
  requireAuth,
  requireRole("admin", "library"),
  requireNotExpiredSubscription,
  async (req, res) => {
    try {
      const libraryId = requireLibraryId(req, res);
      if (!libraryId) return;

      const studentId = String(req.query.studentId || "").trim();
      const filter = { libraryId };
      if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
        filter.studentId = studentId;
      }

      const rows = await StudentPayment.find(filter)
        .sort({ paymentDate: -1 })
        .limit(200)
        .lean();

      return res.json({ ok: true, payments: rows.map(formatPayment) });
    } catch (error) {
      return res.status(500).json({ message: "Failed to load payments", error: error.message });
    }
  }
);

/**
 * POST /api/library/renew-requests/:id/approve
 * Body: { amount?, feeStatus?, feeMethod? }
 */
router.post(
  "/renew-requests/:id/approve",
  requireAuth,
  requireRole("admin", "library"),
  requireNotExpiredSubscription,
  async (req, res) => {
    try {
      const libraryId = requireLibraryId(req, res);
      if (!libraryId) return;

      const requestId = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: "Invalid request id" });
      }

      const reviewerId = req.user?.role === "library" ? req.user?.userId : null;
      const { amount, feeStatus, feeMethod } = req.body || {};

      const result = await approveRenewalRequest({
        libraryId,
        requestId,
        reviewerId,
        amount,
        feeStatus,
        feeMethod,
      });

      return res.json({ ok: true, ...result });
    } catch (error) {
      const code = error.statusCode || 500;
      return res.status(code).json({ message: error.message || "Failed to approve request" });
    }
  }
);

/**
 * POST /api/library/renew-requests/:id/reject
 * Body: { reason? }
 */
router.post(
  "/renew-requests/:id/reject",
  requireAuth,
  requireRole("admin", "library"),
  requireNotExpiredSubscription,
  async (req, res) => {
    try {
      const libraryId = requireLibraryId(req, res);
      if (!libraryId) return;

      const requestId = String(req.params.id || "").trim();
      if (!mongoose.Types.ObjectId.isValid(requestId)) {
        return res.status(400).json({ message: "Invalid request id" });
      }

      const reviewerId = req.user?.role === "library" ? req.user?.userId : null;
      const { reason } = req.body || {};

      const request = await rejectRenewalRequest({
        libraryId,
        requestId,
        reviewerId,
        reason,
      });

      return res.json({ ok: true, request });
    } catch (error) {
      const code = error.statusCode || 500;
      return res.status(code).json({ message: error.message || "Failed to reject request" });
    }
  }
);

module.exports = router;
