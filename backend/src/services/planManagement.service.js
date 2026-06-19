const mongoose = require("mongoose");
const Plan = require("../models/Plan");
const Library = require("../models/Library");
const Subscription = require("../models/Subscription");
const Log = require("../models/Log");
const { writeLog } = require("../utils/logging");
const { countLibrarySubscriptionOverview } = require("../utils/subscription");
const { sumPaidPaymentRevenueRupees, monthOverMonthPeriods } = require("../utils/money");
const { derivePlanType, formatPlanForClient } = require("./planEligibility.service");

function clientIp(req) {
  return (
    String(req?.headers?.["x-forwarded-for"] || "")
      .split(",")[0]
      .trim() ||
    req?.ip ||
    null
  );
}

async function logPlanAudit(req, action, metadata = {}) {
  await writeLog({
    action,
    role: "admin",
    userId: req?.user?.userId || "admin-1",
    libraryId: metadata.libraryId || null,
    ip: clientIp(req),
    userAgent: req?.headers?.["user-agent"] || null,
    metadata: {
      adminName: req?.user?.name || "Super Admin",
      ...metadata,
    },
  });
}

function parseDateOrNull(raw) {
  if (raw == null || raw === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parsePlanPayload(body = {}) {
  const badges = body.badges && typeof body.badges === "object" ? body.badges : {};
  return {
    description: body.description != null ? String(body.description).trim().slice(0, 500) : undefined,
    campaignName:
      body.campaignName === undefined
        ? undefined
        : body.campaignName === null || body.campaignName === ""
          ? null
          : String(body.campaignName).trim().slice(0, 120),
    promoStartDate: body.promoStartDate !== undefined ? parseDateOrNull(body.promoStartDate) : undefined,
    promoEndDate: body.promoEndDate !== undefined ? parseDateOrNull(body.promoEndDate) : undefined,
    badgeRecommended: badges.recommended !== undefined ? Boolean(badges.recommended) : body.badgeRecommended,
    badgeBestValue: badges.bestValue !== undefined ? Boolean(badges.bestValue) : body.badgeBestValue,
    badgeLimitedTime: badges.limitedTime !== undefined ? Boolean(badges.limitedTime) : body.badgeLimitedTime,
    badgeExclusive: badges.exclusive !== undefined ? Boolean(badges.exclusive) : body.badgeExclusive,
  };
}

async function getActivePlanSubscriberCounts() {
  const rows = await Subscription.aggregate([
    { $match: { status: "active" } },
    { $group: { _id: "$plan", count: { $sum: 1 } } },
  ]);
  const map = new Map();
  for (const row of rows) map.set(String(row._id), row.count || 0);
  return map;
}

function libraryVisibilityLabel(plan, subscriberCount) {
  const type = derivePlanType(plan);
  if (type === "library_specific") {
    const n = (plan.allowedLibraryIds || []).length;
    return n ? `${n} libraries` : "0 libraries";
  }
  if (type === "one_time" || type === "trial") {
    return subscriberCount > 0 ? String(subscriberCount) : "—";
  }
  return "All";
}

async function enrichPlanRow(plan, subscriberCounts) {
  const key = String(plan.key || "");
  const subs = subscriberCounts.get(key) || 0;
  const formatted = formatPlanForClient(plan);
  const conversionRate =
    Number(plan.viewCount || 0) > 0
      ? Math.round((Number(plan.purchaseCount || 0) / Number(plan.viewCount)) * 1000) / 10
      : 0;
  return {
    ...formatted,
    planType: derivePlanType(plan),
    planTypeLabel: derivePlanTypeLabel(plan),
    librariesLabel: libraryVisibilityLabel(plan, subs),
    subscriberCount: subs,
    analytics: {
      views: Number(plan.viewCount || 0),
      purchases: Number(plan.purchaseCount || 0),
      conversionRate,
      revenue: Number(plan.revenueTotal || 0),
    },
  };
}

function derivePlanTypeLabel(plan) {
  const t = derivePlanType(plan);
  if (t === "trial") return "Trial";
  if (t === "one_time") return "One Time";
  if (t === "library_specific") return "Private";
  if (t === "promotional") return "Promotional";
  return "Public";
}

async function listEnrichedPlans(filter = {}) {
  const raw = await Plan.find(filter).sort({ duration: 1, finalPrice: 1 }).lean();
  const subscriberCounts = await getActivePlanSubscriberCounts();
  const plans = [];
  for (const p of raw) plans.push(await enrichPlanRow(p, subscriberCounts));
  return plans;
}

async function getPlanManagementOverview() {
  const now = new Date();
  const mom = monthOverMonthPeriods(now);
  const [totalLibraries, subscriptionCounts, monthlyRevenue] = await Promise.all([
    Library.countDocuments({}),
    countLibrarySubscriptionOverview(),
    sumPaidPaymentRevenueRupees({ $gte: mom.currentStart, $lte: mom.currentEnd }),
  ]);
  return {
    totalLibraries,
    activeSubscribers: subscriptionCounts.activePlans,
    monthlyRevenue: Math.round(monthlyRevenue),
    expiringPlans: subscriptionCounts.expiringSoon,
    expiredPlans: subscriptionCounts.expired,
    cancelledPlans: subscriptionCounts.cancelled,
  };
}

async function clonePlan(planId, req) {
  const source = await Plan.findById(planId);
  if (!source) {
    const err = new Error("Plan not found");
    err.statusCode = 404;
    throw err;
  }
  const baseKey = `${String(source.key).slice(0, 30)}-copy`;
  let key = baseKey;
  let i = 1;
  while (await Plan.findOne({ key }).select("_id").lean()) {
    key = `${baseKey}-${i}`;
    i += 1;
  }
  const doc = source.toObject();
  delete doc._id;
  delete doc.createdAt;
  delete doc.updatedAt;
  doc.key = key;
  doc.name = `${source.name} (Copy)`;
  doc.viewCount = 0;
  doc.purchaseCount = 0;
  doc.revenueTotal = 0;
  const created = await Plan.create(doc);
  await logPlanAudit(req, "plan_cloned", {
    sourcePlanId: String(source._id),
    sourcePlanKey: source.key,
    newPlanId: String(created._id),
    newPlanKey: created.key,
  });
  return created;
}

async function recordPlanViews(planIds = []) {
  const ids = planIds.filter((id) => mongoose.Types.ObjectId.isValid(String(id)));
  if (!ids.length) return;
  await Plan.updateMany({ _id: { $in: ids } }, { $inc: { viewCount: 1 } });
}

async function recordPlanPurchase(planId, amountRupees) {
  if (!mongoose.Types.ObjectId.isValid(String(planId))) return;
  const amt = Number(amountRupees || 0);
  await Plan.updateOne(
    { _id: planId },
    { $inc: { purchaseCount: 1, revenueTotal: Number.isFinite(amt) ? amt : 0 } }
  );
}

async function getPlanAnalytics(planId) {
  const plan = await Plan.findById(planId).lean();
  if (!plan) {
    const err = new Error("Plan not found");
    err.statusCode = 404;
    throw err;
  }
  const views = Number(plan.viewCount || 0);
  const purchases = Number(plan.purchaseCount || 0);
  return {
    planId: String(plan._id),
    planKey: plan.key,
    planName: plan.name,
    views,
    purchases,
    conversionRate: views > 0 ? Math.round((purchases / views) * 1000) / 10 : 0,
    revenue: Number(plan.revenueTotal || 0),
  };
}

async function listPlanAuditLogs({ limit = 50 } = {}) {
  const actions = [
    "plan_created",
    "plan_updated",
    "plan_deleted",
    "plan_cloned",
    "plan_assigned",
    "plan_purchased",
    "plan_extended",
  ];
  const rows = await Log.find({ action: { $in: actions } })
    .sort({ timestamp: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();
  return rows.map((r) => ({
    id: String(r._id),
    action: r.action,
    adminName: r.metadata?.adminName || "Super Admin",
    libraryName: r.metadata?.libraryName || null,
    planName: r.metadata?.planName || r.metadata?.planKey || null,
    timestamp: r.timestamp?.toISOString?.() || null,
    ip: r.ip || null,
    metadata: r.metadata || {},
  }));
}

module.exports = {
  logPlanAudit,
  parsePlanPayload,
  listEnrichedPlans,
  getPlanManagementOverview,
  clonePlan,
  recordPlanViews,
  recordPlanPurchase,
  getPlanAnalytics,
  listPlanAuditLogs,
  derivePlanTypeLabel,
};
