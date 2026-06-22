const express = require("express");
const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const Library = require("../models/Library");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const {
  isPlanVisibleToLibrary,
  formatPlanForClient,
  loadLibraryEligibilityContext,
} = require("../services/planEligibility.service");
const {
  logPlanAudit,
  parsePlanPayload,
  listEnrichedPlans,
  getPlanManagementOverview,
  clonePlan,
  recordPlanViews,
  getPlanAnalytics,
  listPlanAuditLogs,
} = require("../services/planManagement.service");

const router = express.Router();
let seeded = false;

function calcFinal(price, discount) {
  const p = Number(price || 0);
  const d = Math.min(100, Math.max(0, Number(discount || 0)));
  return Math.max(0, Math.round((p - p * (d / 100)) * 100) / 100);
}

function parseBool(raw, fallback) {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return fallback;
}

function parseAllowedLibraryIds(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
}

function resolvePlanKey(rawKey, rawName) {
  return Plan.normalizeKey(rawKey || rawName || "");
}

function planKeyError(key) {
  if (!key) {
    return "Plan key is required (letters, numbers, hyphens only — e.g. 6-month, premium-yearly)";
  }
  if (!Plan.isValidKey(key)) {
    return "Invalid plan key — use lowercase letters, numbers, hyphens or underscores (max 40 chars)";
  }
  return null;
}

async function ensureSeed() {
  if (seeded) return;
  const defaults = [
    {
      key: "trial",
      name: "Trial Plan",
      price: 99,
      discount: 0,
      duration: 30,
      isTrial: true,
      showOnlyForNew: true,
      isOneTimeOffer: true,
      isPublic: true,
      isActive: true,
      tag: "Start here",
    },
    {
      key: "monthly",
      name: "Monthly",
      price: 999,
      discount: 0,
      duration: 30,
      isTrial: false,
      showOnlyForNew: false,
      isPublic: true,
      isActive: true,
      tag: null,
    },
    {
      key: "6month",
      name: "6 Month",
      price: 4999,
      discount: 0,
      duration: 180,
      isTrial: false,
      showOnlyForNew: false,
      isPublic: true,
      isActive: true,
      tag: "Popular",
    },
    {
      key: "yearly",
      name: "Yearly",
      price: 9999,
      discount: 0,
      duration: 365,
      isTrial: false,
      showOnlyForNew: false,
      isPublic: true,
      isActive: true,
      tag: "Best Value",
    },
  ];

  try {
    for (const d of defaults) {
      // eslint-disable-next-line no-await-in-loop
      const existing = await Plan.findOne({ key: d.key });
      if (!existing) {
        // eslint-disable-next-line no-await-in-loop
        await Plan.create(d);
        continue;
      }
      if (existing.isTrial === undefined) existing.isTrial = Boolean(d.isTrial);
      if (existing.showOnlyForNew === undefined) existing.showOnlyForNew = Boolean(d.showOnlyForNew);
      if (existing.isOneTimeOffer === undefined && d.isOneTimeOffer) existing.isOneTimeOffer = true;
      if (existing.isPublic === undefined) existing.isPublic = true;
      // eslint-disable-next-line no-await-in-loop
      await existing.save();
    }
    seeded = true;
  } catch (error) {
    seeded = false;
    throw error;
  }
}

const PLAN_SELECT =
  "name key price discount finalPrice originalPrice duration isActive tag isTrial showOnlyForNew isPublic isOneTimeOffer allowedLibraryIds description campaignName promoStartDate promoEndDate badgeRecommended badgeBestValue badgeLimitedTime badgeExclusive viewCount purchaseCount revenueTotal";

/**
 * GET /api/plans/management-overview — Super Admin dashboard cards
 */
router.get("/management-overview", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const overview = await getPlanManagementOverview();
    return res.json({ ok: true, overview });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plan overview", error: error.message });
  }
});

/**
 * GET /api/plans/audit-logs
 */
router.get("/audit-logs", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const logs = await listPlanAuditLogs({ limit: req.query.limit });
    return res.json({ ok: true, logs });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load plan audit logs", error: error.message });
  }
});

/**
 * GET /api/plans
 *
 * Library sees eligible active plans only.
 * Admin can see all by passing ?all=1
 */
router.get("/", requireAuth, async (req, res) => {
  try {
    await ensureSeed();
    const role = req.user?.role;
    const wantAll = String(req.query.all || "").trim() === "1";
    if (wantAll && role !== "admin") {
      return res.status(403).json({ message: "Only Super Admin can access all plans" });
    }

    const filter = role === "admin" && wantAll ? {} : { isActive: true };
    const enriched = String(req.query.enriched || "").trim() === "1";

    if (role === "admin" && wantAll && enriched) {
      const plans = await listEnrichedPlans(filter);
      return res.json({ ok: true, plans });
    }

    const raw = await Plan.find(filter).sort({ duration: 1, finalPrice: 1 }).select(PLAN_SELECT).lean();

    if (role === "library") {
      const hasTrialLike = (raw || []).some((p) => p.isTrial || p.showOnlyForNew);
      const { library, subscriptionCount } = await loadLibraryEligibilityContext(req.user?.libraryId, {
        skipSubscriptionCount: !hasTrialLike,
      });
      const eligibilityOpts = { subscriptionCount };
      const visible = (raw || []).filter((p) => isPlanVisibleToLibrary(p, library, eligibilityOpts));
      const planIds = visible.map((p) => p._id).filter(Boolean);
      void recordPlanViews(planIds);
      const plans = visible.map((p) => formatPlanForClient({ ...p, finalPrice: calcFinal(p?.price, p?.discount) }));
      return res.json({ ok: true, plans });
    }

    const plans = (raw || []).map((p) =>
      formatPlanForClient({ ...p, finalPrice: calcFinal(p?.price, p?.discount) })
    );
    return res.json({ ok: true, plans });
  } catch (error) {
    console.error("Plan API Error:", error);
    return res.status(500).json({ message: "Failed to load plans", error: error.message });
  }
});

/**
 * POST /api/plans
 */
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const key = resolvePlanKey(req.body?.key, name);
    const price = Number(req.body?.price);
    const discount = Number(req.body?.discount ?? 0);
    const duration = Number(req.body?.duration);
    const isActive = req.body?.isActive === undefined ? true : Boolean(req.body.isActive);
    const tag = req.body?.tag === undefined || req.body?.tag === null ? null : String(req.body.tag).trim();
    const originalPrice =
      req.body?.originalPrice === undefined || req.body?.originalPrice === null
        ? null
        : Number(req.body.originalPrice);
    const isPublic = parseBool(req.body?.isPublic, true);
    const isOneTimeOffer = parseBool(req.body?.isOneTimeOffer, false);
    const isTrial = parseBool(req.body?.isTrial, false);
    const allowedLibraryIds = parseAllowedLibraryIds(req.body?.allowedLibraryIds);
    const enterprise = parsePlanPayload(req.body);

    if (!name) return res.status(400).json({ message: "name is required" });
    const keyErr = planKeyError(key);
    if (keyErr) return res.status(400).json({ message: keyErr });
    if (!Number.isFinite(price) || price < 0) return res.status(400).json({ message: "Invalid price" });
    if (!Number.isFinite(duration) || duration < 1) return res.status(400).json({ message: "Invalid duration" });
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return res.status(400).json({ message: "Invalid discount" });
    }
    if (originalPrice != null && (!Number.isFinite(originalPrice) || originalPrice < 0)) {
      return res.status(400).json({ message: "Invalid originalPrice" });
    }
    if (!isPublic && !allowedLibraryIds.length) {
      return res.status(400).json({ message: "Library-specific plans require at least one library" });
    }

    const existing = await Plan.findOne({ key }).select("_id").lean();
    if (existing) return res.status(400).json({ message: "Plan key already exists" });

    const plan = await Plan.create({
      name,
      key,
      price,
      discount,
      finalPrice: calcFinal(price, discount),
      duration,
      isActive,
      tag,
      originalPrice,
      isPublic,
      isOneTimeOffer,
      isTrial,
      allowedLibraryIds,
      ...Object.fromEntries(
        Object.entries(enterprise).filter(([, v]) => v !== undefined)
      ),
    });
    await logPlanAudit(req, "plan_created", { planId: String(plan._id), planKey: plan.key, planName: plan.name });
    return res.status(201).json({ ok: true, plan: formatPlanForClient(plan.toObject()) });
  } catch (error) {
    console.error("Plan API Error:", error);
    if (error?.code === 11000) return res.status(400).json({ message: "Plan key already exists" });
    if (error?.name === "ValidationError") {
      const keyMsg = error?.errors?.key?.message;
      return res.status(400).json({
        message: keyMsg || error.message || "Invalid plan data",
      });
    }
    return res.status(500).json({ message: "Failed to create plan", error: error.message });
  }
});

/**
 * GET /api/plans/:id/analytics
 */
router.get("/:id/analytics", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const analytics = await getPlanAnalytics(req.params.id);
    return res.json({ ok: true, analytics });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to load analytics" });
  }
});

/**
 * POST /api/plans/:id/clone
 */
router.post("/:id/clone", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const created = await clonePlan(req.params.id, req);
    return res.status(201).json({ ok: true, plan: formatPlanForClient(created.toObject()) });
  } catch (error) {
    const status = error.statusCode || 500;
    return res.status(status).json({ message: error.message || "Failed to clone plan" });
  }
});

/**
 * PUT /api/plans/:id
 */
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });

    const patch = {};
    if (req.body?.name !== undefined) patch.name = String(req.body.name || "").trim();
    if (req.body?.price !== undefined) patch.price = Number(req.body.price);
    if (req.body?.discount !== undefined) patch.discount = Number(req.body.discount);
    if (req.body?.duration !== undefined) patch.duration = Number(req.body.duration);
    if (req.body?.isActive !== undefined) patch.isActive = Boolean(req.body.isActive);
    if (req.body?.tag !== undefined) patch.tag = req.body.tag === null ? null : String(req.body.tag || "").trim();
    if (req.body?.originalPrice !== undefined) {
      patch.originalPrice =
        req.body.originalPrice === null || req.body.originalPrice === ""
          ? null
          : Number(req.body.originalPrice);
    }
    if (req.body?.isPublic !== undefined) patch.isPublic = parseBool(req.body.isPublic, true);
    if (req.body?.isOneTimeOffer !== undefined) patch.isOneTimeOffer = parseBool(req.body.isOneTimeOffer, false);
    if (req.body?.isTrial !== undefined) patch.isTrial = parseBool(req.body.isTrial, false);
    if (req.body?.allowedLibraryIds !== undefined) {
      patch.allowedLibraryIds = parseAllowedLibraryIds(req.body.allowedLibraryIds);
    }
    Object.assign(patch, Object.fromEntries(
      Object.entries(parsePlanPayload(req.body)).filter(([, v]) => v !== undefined)
    ));

    if (patch.name !== undefined && patch.name === "") {
      return res.status(400).json({ message: "name cannot be empty" });
    }
    if (patch.price !== undefined && (!Number.isFinite(patch.price) || patch.price < 0)) {
      return res.status(400).json({ message: "Invalid price" });
    }
    if (patch.discount !== undefined && (!Number.isFinite(patch.discount) || patch.discount < 0 || patch.discount > 100)) {
      return res.status(400).json({ message: "Invalid discount" });
    }
    if (patch.duration !== undefined && (!Number.isFinite(patch.duration) || patch.duration < 1)) {
      return res.status(400).json({ message: "Invalid duration" });
    }
    if (
      patch.originalPrice !== undefined &&
      patch.originalPrice != null &&
      (!Number.isFinite(patch.originalPrice) || patch.originalPrice < 0)
    ) {
      return res.status(400).json({ message: "Invalid originalPrice" });
    }

    const nextIsPublic = patch.isPublic !== undefined ? patch.isPublic : plan.isPublic !== false;
    const nextAllowed =
      patch.allowedLibraryIds !== undefined ? patch.allowedLibraryIds : plan.allowedLibraryIds || [];
    if (!nextIsPublic && (!nextAllowed || !nextAllowed.length)) {
      return res.status(400).json({ message: "Library-specific plans require at least one library" });
    }

    if (patch.price !== undefined || patch.discount !== undefined) {
      const nextPrice = patch.price !== undefined ? patch.price : plan?.price;
      const nextDiscount = patch.discount !== undefined ? patch.discount : plan?.discount;
      patch.finalPrice = calcFinal(nextPrice, nextDiscount);
    }

    Object.assign(plan, patch);
    await plan.save();
    await logPlanAudit(req, "plan_updated", { planId: String(plan._id), planKey: plan.key, planName: plan.name });
    return res.json({ ok: true, plan: formatPlanForClient(plan.toObject()) });
  } catch (error) {
    console.error("Plan API Error:", error);
    return res.status(500).json({ message: "Failed to update plan", error: error.message });
  }
});

/**
 * DELETE /api/plans/:id
 */
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const id = String(req.params.id || "").trim();
    const plan = await Plan.findById(id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    if (plan.key === "trial") {
      return res.status(400).json({ message: "Cannot delete system plan" });
    }
    await Plan.deleteOne({ _id: plan._id });
    await logPlanAudit(req, "plan_deleted", { planId: String(plan._id), planKey: plan.key, planName: plan.name });
    return res.json({ ok: true });
  } catch (error) {
    console.error("Plan API Error:", error);
    return res.status(500).json({ message: "Failed to delete plan", error: error.message });
  }
});

module.exports = router;
