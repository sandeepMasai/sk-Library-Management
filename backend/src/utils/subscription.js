const Library = require("../models/Library");
const Subscription = require("../models/Subscription");
const mongoose = require("mongoose");
const { getPlanDef } = require("./paymentPlans");

/**
 * Centralized subscription rules for library SaaS.
 * Paid plans only — activation after Razorpay (see activatePaidSubscription).
 */

const PLAN_CATALOG = {
  pro_monthly: { plan: "pro", price: 999, durationDays: 30 },
  pro_6_month: { plan: "pro", price: 4999, durationDays: 180 },
  pro_yearly: { plan: "pro", price: 10000, durationDays: 365 },
};

function planKeyToAdminPlan(planKey) {
  const key = String(planKey || "").trim();
  if (key === "pro_monthly") return "monthly";
  if (key === "pro_6_month") return "6month";
  if (key === "pro_yearly") return "yearly";
  return null;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function toIsoDateOrNull(value) {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

/**
 * API-facing subscription period: prefers Subscription row, then Library fields, then createdAt for start.
 */
function resolveLibrarySubscriptionPeriod(lib, latestSub) {
  const startDate = toIsoDateOrNull(
    latestSub?.startDate ?? lib.planStartDate ?? lib.createdAt
  );
  const expiryDate = toIsoDateOrNull(latestSub?.expiryDate ?? lib.planExpiryDate);
  return { startDate, expiryDate };
}

async function ensureLibraryNotExpired(library) {
  if (!library) return null;

  const expiry = library.planExpiryDate ? new Date(library.planExpiryDate).getTime() : null;
  if (!expiry) return library; // non-expiring plan (or no plan yet)

  if (Date.now() <= expiry) return library;

  // Expired → must renew via payment (no automatic tier).
  library.subscriptionStatus = "expired";
  library.plan = "none";
  library.currentPlanKey = "none";
  await library.save();
  return library;
}

async function upgradeLibraryPlan({ libraryId, planKey }) {
  const key = String(planKey || "").trim();
  const planDef = PLAN_CATALOG[key];
  if (!planDef) {
    const err = new Error("Invalid plan");
    err.statusCode = 400;
    throw err;
  }

  const library = await Library.findById(libraryId);
  if (!library) {
    const err = new Error("Library not found");
    err.statusCode = 404;
    throw err;
  }

  const start = new Date();
  const expiry = planDef.durationDays ? addDays(start, planDef.durationDays) : null;

  library.plan = planDef.plan;
  library.currentPlanKey = planKeyToAdminPlan(key) || (planDef.plan === "pro" ? "monthly" : "none");
  library.subscriptionStatus = "active";
  library.cancelledAt = null;
  library.planStartDate = start;
  library.planExpiryDate = expiry;
  await library.save();

  // Write a durable admin-friendly subscription row (used by admin screens).
  const adminPlan = planKeyToAdminPlan(key) || (planDef.plan === "pro" ? "monthly" : "none");
  if (expiry) {
    await Subscription.create({
      libraryId: library._id,
      plan: adminPlan,
      price: Number(planDef.price || 0),
      durationDays: planDef.durationDays,
      startDate: start,
      expiryDate: expiry,
      status: "active",
      paymentStatus: "paid",
    });
  }

  return { library, planDef };
}

/**
 * Same rules as GET /api/admin/subscriptions row status (active / expired / cancelled).
 */
function computeLibrarySubscriptionStatus(lib, latestSub = null, now = new Date()) {
  const endMs = latestSub?.expiryDate
    ? new Date(latestSub.expiryDate).getTime()
    : lib.planExpiryDate
      ? new Date(lib.planExpiryDate).getTime()
      : null;
  const isCancelled =
    latestSub?.status === "cancelled" || lib.subscriptionStatus === "cancelled";
  if (isCancelled) return "cancelled";
  if (endMs && Number.isFinite(endMs) && endMs < now.getTime()) return "expired";
  return "active";
}

const PLAN_LABELS = {
  none: "Free",
  trial: "Trial",
  monthly: "Monthly",
  "6month": "6-Month",
  yearly: "Yearly",
  pro: "Pro",
};

async function fetchLibrariesWithLatestSub() {
  return Library.aggregate([
    {
      $lookup: {
        from: Subscription.collection.name,
        let: { libraryId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$libraryId", "$$libraryId"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 },
        ],
        as: "sub",
      },
    },
    { $addFields: { sub: { $arrayElemAt: ["$sub", 0] } } },
    {
      $project: {
        name: 1,
        ownerName: 1,
        email: 1,
        libraryCode: 1,
        plan: 1,
        planStartDate: 1,
        planExpiryDate: 1,
        subscriptionStatus: 1,
        cancelledAt: 1,
        cancelReason: 1,
        cancelNote: 1,
        isActive: 1,
        createdAt: 1,
        sub: 1,
      },
    },
  ]);
}

function formatLibraryPlanLabel(plan) {
  const key = String(plan || "none").trim().toLowerCase();
  return PLAN_LABELS[key] || key;
}

function formatCancelledLibraryRow(lib, sub) {
  const plan = sub?.plan || (lib.plan === "pro" ? "monthly" : "none");
  const { expiryDate } = resolveLibrarySubscriptionPeriod(lib, sub);
  const cancelledAt = sub?.cancelledAt || lib.cancelledAt || null;
  return {
    id: lib._id.toString(),
    libraryId: lib._id.toString(),
    name: lib.name,
    ownerName: lib.ownerName || "",
    email: lib.email || "",
    libraryCode: lib.libraryCode || null,
    plan,
    planLabel: formatLibraryPlanLabel(plan),
    expiryDate,
    cancelledAt: cancelledAt?.toISOString?.() || null,
    cancelReason: lib.cancelReason || sub?.cancelReason || null,
    cancelNote: lib.cancelNote || sub?.cancelNote || null,
    isActive: Boolean(lib.isActive),
  };
}

/**
 * Platform-wide library plan counts for super-admin dashboards.
 */
async function countLibrarySubscriptionOverview() {
  const now = new Date();
  const soonMs = 7 * 24 * 60 * 60 * 1000;
  const list = await fetchLibrariesWithLatestSub();

  let activePlans = 0;
  let expiringSoon = 0;
  let expired = 0;
  let cancelled = 0;

  for (const lib of list) {
    const sub = lib.sub || null;
    const status = computeLibrarySubscriptionStatus(lib, sub, now);
    if (status === "expired") {
      expired += 1;
      continue;
    }
    if (status === "cancelled") {
      cancelled += 1;
      continue;
    }
    activePlans += 1;
    const { expiryDate } = resolveLibrarySubscriptionPeriod(lib, sub);
    if (expiryDate) {
      const t = new Date(expiryDate).getTime();
      if (Number.isFinite(t) && t - now.getTime() <= soonMs) expiringSoon += 1;
    }
  }

  return { activePlans, expiringSoon, expired, cancelled };
}

/**
 * Libraries whose latest subscription status is cancelled.
 */
async function listCancelledLibraries() {
  const now = new Date();
  const list = await fetchLibrariesWithLatestSub();
  const rows = [];

  for (const lib of list) {
    const sub = lib.sub || null;
    if (computeLibrarySubscriptionStatus(lib, sub, now) !== "cancelled") continue;
    rows.push(formatCancelledLibraryRow(lib, sub));
  }

  rows.sort((a, b) => String(b.cancelledAt || "").localeCompare(String(a.cancelledAt || "")));
  return rows;
}

module.exports = {
  PLAN_CATALOG,
  planKeyToAdminPlan,
  addDays,
  ensureLibraryNotExpired,
  resolveLibrarySubscriptionPeriod,
  computeLibrarySubscriptionStatus,
  countLibrarySubscriptionOverview,
  listCancelledLibraries,
  toIsoDateOrNull,
  upgradeLibraryPlan,
  /**
   * Activate (or extend) a paid subscription after verified payment.
   *
   * Plan: monthly | 6month | yearly
   */
  activatePaidSubscription: async ({ libraryId, plan, planMeta = null }) => {
    // plan can be a key string or an object from admin-managed Plan collection.
    const def =
      typeof plan === "string" ? await getPlanDef(plan) : { key: plan.key, price: plan.price, durationDays: plan.durationDays };
    if (!def) {
      const err = new Error("Invalid plan");
      err.statusCode = 400;
      throw err;
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      const err = new Error("Library not found");
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const currentExpiryMs = library.planExpiryDate ? new Date(library.planExpiryDate).getTime() : null;
    const base = currentExpiryMs && Number.isFinite(currentExpiryMs) && currentExpiryMs > now.getTime() ? new Date(currentExpiryMs) : now;
    const nextExpiry = addDays(base, def.durationDays);

    library.plan = "pro";
    library.currentPlanKey = def.key;
    library.subscriptionStatus = "active";
    if (def.key === "trial" || planMeta?.isOneTimeOffer || planMeta?.isTrial) {
      library.trialUsed = def.key === "trial" ? true : library.trialUsed;
      const key = String(def.key || "").trim().toLowerCase();
      if (key) {
        const used = Array.isArray(library.usedOneTimePlans) ? library.usedOneTimePlans : [];
        if (!used.includes(key)) {
          library.usedOneTimePlans = [...used, key];
        }
      }
    }
    library.cancelledAt = null;
    library.cancelReason = null;
    library.cancelNote = null;
    library.planStartDate = now;
    library.planExpiryDate = nextExpiry;
    await library.save();

    await Subscription.create({
      libraryId: library._id,
      plan: def.key,
      price: def.price,
      durationDays: def.durationDays,
      startDate: now,
      expiryDate: nextExpiry,
      status: "active",
      paymentStatus: "paid",
    });

    return { library, subscription: { plan: def.key, price: def.price, startDate: now, expiryDate: nextExpiry } };
  },

  /**
   * Super Admin: assign a plan immediately without payment.
   */
  assignLibraryPlanByAdmin: async ({ libraryId, planId, planKey, markOneTimeUsed = false }) => {
    const Plan = require("../models/Plan");
    let planDoc = null;
    if (planId && mongoose.Types.ObjectId.isValid(String(planId))) {
      planDoc = await Plan.findById(planId);
    } else if (planKey) {
      planDoc = await Plan.findOne({ key: String(planKey).trim().toLowerCase() });
    }
    if (!planDoc || !planDoc.isActive) {
      const err = new Error("Plan not found");
      err.statusCode = 404;
      throw err;
    }

    const library = await Library.findById(libraryId);
    if (!library) {
      const err = new Error("Library not found");
      err.statusCode = 404;
      throw err;
    }

    const now = new Date();
    const nextExpiry = addDays(now, Number(planDoc.duration || 0));

    library.plan = "pro";
    library.currentPlanKey = planDoc.key;
    library.subscriptionStatus = "active";
    library.cancelledAt = null;
    library.cancelReason = null;
    library.cancelNote = null;
    library.planStartDate = now;
    library.planExpiryDate = nextExpiry;
    if (planDoc.key === "trial") library.trialUsed = true;
    if (markOneTimeUsed && (planDoc.isOneTimeOffer || planDoc.isTrial)) {
      const key = String(planDoc.key || "").trim().toLowerCase();
      const used = Array.isArray(library.usedOneTimePlans) ? library.usedOneTimePlans : [];
      if (key && !used.includes(key)) {
        library.usedOneTimePlans = [...used, key];
      }
    }
    await library.save();

    await Subscription.create({
      libraryId: library._id,
      plan: planDoc.key,
      price: Number(planDoc.finalPrice ?? planDoc.price ?? 0),
      durationDays: Number(planDoc.duration || 0),
      startDate: now,
      expiryDate: nextExpiry,
      status: "active",
      paymentStatus: "paid",
      billingMeta: { source: "admin_assign" },
    });

    return {
      library,
      plan: {
        key: planDoc.key,
        name: planDoc.name,
        price: Number(planDoc.finalPrice ?? planDoc.price ?? 0),
        startDate: now,
        expiryDate: nextExpiry,
      },
    };
  },
};

