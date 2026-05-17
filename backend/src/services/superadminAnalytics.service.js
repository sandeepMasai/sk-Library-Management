const Library = require("../models/Library");
const Log = require("../models/Log");
const Payment = require("../models/Payment");
const RenewalRequest = require("../models/RenewalRequest");
const {
  countLibrarySubscriptionOverview,
  listCancelledLibraries,
} = require("../utils/subscription");
const {
  mongoNormalizePaymentAmountExpr,
  roundRupees,
  computeGrowthPercent,
  monthOverMonthPeriods,
  sumPaidPaymentRevenueRupees,
} = require("../utils/money");

const ACTIVITY_LIMIT = 20;
const LIBRARY_LIMIT = 8;

const PLAN_LABELS = {
  none: "Free",
  trial: "Trial",
  monthly: "Monthly",
  "6month": "6-Month",
  yearly: "Yearly",
  pro: "Pro",
};

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function planLabel(lib) {
  const key = String(lib.currentPlanKey || lib.plan || "none").toLowerCase();
  return PLAN_LABELS[key] || key;
}

function classifyActivity(action) {
  const a = String(action || "").toLowerCase();
  if (a.includes("register") || a.includes("library_created") || a.includes("signup")) {
    return { type: "registration", label: "New registration" };
  }
  if (a.includes("payment") && (a.includes("success") || a.includes("paid") || a.includes("verified"))) {
    return { type: "payment", label: "Payment success" };
  }
  if (a.includes("plan_upgrade") || a.includes("subscription_activated") || a.includes("subscription_upgraded")) {
    return { type: "plan_upgrade", label: "Plan upgrade" };
  }
  if (a.includes("student_created") || a.includes("student_added")) {
    return { type: "student", label: "Student added" };
  }
  if (a.includes("subscription_expir") || a.includes("plan_expir")) {
    return { type: "expiry", label: "Subscription expiry" };
  }
  if (a.includes("login")) {
    return { type: "login", label: "Login activity" };
  }
  return { type: "other", label: "Platform activity" };
}

async function getRecentLibraries(limit = LIBRARY_LIMIT) {
  const rows = await Library.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(20, Math.max(1, limit)))
    .select("name ownerName city state plan currentPlanKey isActive createdAt")
    .lean();

  return rows.map((lib) => ({
    id: lib._id.toString(),
    name: lib.name,
    ownerName: lib.ownerName,
    city: lib.city || "",
    state: lib.state || "",
    planName: planLabel(lib),
    joinedAt: lib.createdAt?.toISOString?.() || null,
    status: lib.isActive ? "active" : "inactive",
    isActive: Boolean(lib.isActive),
  }));
}

async function getRecentActivity(limit = ACTIVITY_LIMIT) {
  const rows = await Log.find({})
    .sort({ timestamp: -1 })
    .limit(Math.min(50, Math.max(1, limit)))
    .select("action role libraryId timestamp metadata")
    .populate("libraryId", "name")
    .lean();

  return rows.map((row) => {
    const kind = classifyActivity(row.action);
    const libraryName = row.libraryId?.name || null;
    const title = kind.label;
    const actionText = String(row.action || "")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (m) => m.toUpperCase());
    return {
      id: row._id.toString(),
      type: kind.type,
      action: row.action,
      title,
      description: libraryName ? `${actionText} · ${libraryName}` : actionText,
      libraryId: row.libraryId?._id?.toString?.() || row.libraryId?.toString?.() || null,
      libraryName,
      role: row.role || null,
      timestamp: row.timestamp?.toISOString?.() || null,
    };
  });
}

async function getRevenueOverview() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const mom = monthOverMonthPeriods(now);
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    totalRevenue,
    monthlyRevenue,
    todayRevenue,
    previousPeriodRevenue,
    subscriptionCounts,
    pendingRenewals,
    dailySparklineAgg,
    monthlyTrendAgg,
  ] = await Promise.all([
    sumPaidPaymentRevenueRupees(),
    sumPaidPaymentRevenueRupees({ $gte: mom.currentStart, $lte: mom.currentEnd }),
    sumPaidPaymentRevenueRupees({ $gte: todayStart }),
    sumPaidPaymentRevenueRupees({ $gte: mom.previousStart, $lte: mom.previousEnd }),
    countLibrarySubscriptionOverview(),
    RenewalRequest.countDocuments({ status: "pending" }),
    Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $addFields: {
          paidAt: { $ifNull: ["$verifiedAt", "$createdAt"] },
          amountPaise: mongoNormalizePaymentAmountExpr(),
        },
      },
      { $match: { paidAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          revenuePaise: { $sum: "$amountPaise" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: "paid" } },
      {
        $addFields: {
          paidAt: { $ifNull: ["$verifiedAt", "$createdAt"] },
          amountPaise: mongoNormalizePaymentAmountExpr(),
        },
      },
      { $match: { paidAt: { $gte: prevMonthStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
          revenuePaise: { $sum: "$amountPaise" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const growthPercent = computeGrowthPercent(monthlyRevenue, previousPeriodRevenue);

  const sparklineMap = new Map(
    dailySparklineAgg.map((r) => [String(r._id), roundRupees((r.revenuePaise || 0) / 100)])
  );
  const sparkline = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    sparkline.push({ date: key, revenue: sparklineMap.get(key) || 0 });
  }

  const monthlyTrend = monthlyTrendAgg.map((r) => ({
    month: String(r._id),
    revenue: roundRupees((r.revenuePaise || 0) / 100),
  }));

  return {
    totalRevenue,
    monthlyRevenue,
    todayRevenue,
    activeSubscriptions: subscriptionCounts.activePlans,
    cancelledSubscriptions: subscriptionCounts.cancelled,
    pendingRenewals,
    growthPercent,
    sparkline,
    monthlyTrend,
  };
}

async function getSubscriptionOverview() {
  const counts = await countLibrarySubscriptionOverview();
  return {
    active: counts.activePlans,
    expiringSoon: counts.expiringSoon,
    expired: counts.expired,
    cancelled: counts.cancelled,
  };
}

async function getCancelledLibraries() {
  const libraries = await listCancelledLibraries();
  return { count: libraries.length, libraries };
}

module.exports = {
  getRecentLibraries,
  getRecentActivity,
  getRevenueOverview,
  getSubscriptionOverview,
  getCancelledLibraries,
  ACTIVITY_LIMIT,
  LIBRARY_LIMIT,
};
