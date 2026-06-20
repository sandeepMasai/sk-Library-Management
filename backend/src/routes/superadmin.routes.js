const express = require("express");
const { requireAdminAuth } = require("../middleware/admin.middleware");
const {
  getRecentLibraries,
  getRecentActivity,
  getRevenueOverview,
  getSubscriptionOverview,
  getCancelledLibraries,
  getPlatformTrends,
  getPlanDistribution,
} = require("../services/superadminAnalytics.service");
const {
  listLibrariesWithStudentAnalytics,
  listLibraryStudents,
  getStudentDetail,
} = require("../services/superadminStudents.service");
const {
  getPaymentsOverview,
  listPayments,
  getPaymentById,
} = require("../services/superadminPayments.service");
const { getPlanManagementOverview, listPlanAuditLogs } = require("../services/planManagement.service");

const router = express.Router();

/**
 * GET /api/superadmin/recent-libraries?limit=8
 */
router.get("/recent-libraries", requireAdminAuth, async (req, res) => {
  try {
    const limit = Math.min(20, Math.max(1, Number(req.query.limit || 8)));
    const libraries = await getRecentLibraries(limit);
    return res.json({ ok: true, libraries });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load recent libraries", error: error.message });
  }
});

/**
 * GET /api/superadmin/recent-activity?limit=20
 */
router.get("/recent-activity", requireAdminAuth, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const activities = await getRecentActivity(limit);
    return res.json({ ok: true, activities });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load recent activity", error: error.message });
  }
});

/**
 * GET /api/superadmin/revenue-overview
 */
router.get("/revenue-overview", requireAdminAuth, async (req, res) => {
  try {
    const overview = await getRevenueOverview();
    return res.json({ ok: true, overview });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load revenue overview", error: error.message });
  }
});

/**
 * GET /api/superadmin/subscription-overview
 */
router.get("/subscription-overview", requireAdminAuth, async (req, res) => {
  try {
    const overview = await getSubscriptionOverview();
    return res.json({ ok: true, overview });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load subscription overview", error: error.message });
  }
});

/**
 * GET /api/superadmin/plan-management-overview
 * Dashboard cards: libraries, subscribers, revenue, expiring plans.
 */
router.get("/plan-management-overview", requireAdminAuth, async (req, res) => {
  try {
    const overview = await getPlanManagementOverview();
    return res.json({ ok: true, overview });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plan overview", error: error.message });
  }
});

/**
 * GET /api/superadmin/plan-audit-logs?limit=20
 */
router.get("/plan-audit-logs", requireAdminAuth, async (req, res) => {
  try {
    const logs = await listPlanAuditLogs({ limit: req.query.limit });
    return res.json({ ok: true, logs });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plan audit logs", error: error.message });
  }
});

/**
 * GET /api/superadmin/platform-trends
 * 7-day sparklines for libraries, subscriptions, expiries + MoM growth.
 */
router.get("/platform-trends", requireAdminAuth, async (req, res) => {
  try {
    const trends = await getPlatformTrends();
    return res.json({ ok: true, trends });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load platform trends", error: error.message });
  }
});

/**
 * GET /api/superadmin/plan-distribution
 * Active library counts grouped by plan key.
 */
router.get("/plan-distribution", requireAdminAuth, async (req, res) => {
  try {
    const distribution = await getPlanDistribution();
    return res.json({ ok: true, distribution });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plan distribution", error: error.message });
  }
});

/**
 * GET /api/superadmin/cancelled-libraries
 */
router.get("/cancelled-libraries", requireAdminAuth, async (req, res) => {
  try {
    const data = await getCancelledLibraries();
    return res.json({ ok: true, ...data });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load cancelled libraries", error: error.message });
  }
});

/**
 * GET /api/superadmin/libraries?page=&limit=&search=
 * Libraries with per-library student analytics for Super Admin Students hub.
 */
router.get("/libraries", requireAdminAuth, async (req, res) => {
  try {
    const data = await listLibrariesWithStudentAnalytics(req.query);
    return res.json({ ok: true, ...data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Failed to load libraries", error: error.message });
  }
});

/**
 * GET /api/superadmin/libraries/:libraryId/students
 */
router.get("/libraries/:libraryId/students", requireAdminAuth, async (req, res) => {
  try {
    const data = await listLibraryStudents(req.params.libraryId, req.query);
    return res.json({ ok: true, ...data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Failed to load students", error: error.message });
  }
});

/**
 * GET /api/superadmin/students/:studentId
 */
router.get("/students/:studentId", requireAdminAuth, async (req, res) => {
  try {
    const student = await getStudentDetail(req.params.studentId);
    return res.json({ ok: true, student });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Failed to load student", error: error.message });
  }
});

/**
 * GET /api/superadmin/payments/overview
 */
router.get("/payments/overview", requireAdminAuth, async (req, res) => {
  try {
    const overview = await getPaymentsOverview();
    return res.json({ ok: true, overview });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load payments overview", error: error.message });
  }
});

/**
 * GET /api/superadmin/payments?page=&limit=&status=&plan=&search=&from=&to=
 */
router.get("/payments", requireAdminAuth, async (req, res) => {
  try {
    const data = await listPayments(req.query);
    return res.json({ ok: true, ...data });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load payments", error: error.message });
  }
});

/**
 * GET /api/superadmin/payments/:paymentId
 */
router.get("/payments/:paymentId", requireAdminAuth, async (req, res) => {
  try {
    const payment = await getPaymentById(req.params.paymentId);
    return res.json({ ok: true, payment });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message || "Failed to load payment", error: error.message });
  }
});

module.exports = router;
