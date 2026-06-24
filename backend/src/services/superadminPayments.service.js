const mongoose = require("mongoose");
const Payment = require("../models/Payment");
const Library = require("../models/Library");
const { countLibrarySubscriptionOverview } = require("../utils/subscription");
const {
  mongoNormalizePaymentAmountExpr,
  paiseToRupees,
  roundRupees,
  computeGrowthPercent,
  monthOverMonthPeriods,
  sumPaidPaymentRevenueRupees,
} = require("../utils/money");

const PLAN_LABELS = {
  trial: "Trial",
  monthly: "Monthly",
  "6month": "6-Month",
  yearly: "Yearly",
};

function paidAtExpr() {
  return { $ifNull: ["$verifiedAt", "$createdAt"] };
}

function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function planLabel(key) {
  return PLAN_LABELS[String(key || "").toLowerCase()] || key || "—";
}

async function getPaymentsOverview() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const mom = monthOverMonthPeriods(now);
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

  const [
    totalRevenue,
    monthlyRevenue,
    todayRevenue,
    previousPeriodRevenue,
    pendingCount,
    failedCount,
    subscriptionCounts,
    sparklineAgg,
    statusAgg,
  ] = await Promise.all([
    sumPaidPaymentRevenueRupees(),
    sumPaidPaymentRevenueRupees({ $gte: mom.currentStart, $lte: mom.currentEnd }),
    sumPaidPaymentRevenueRupees({ $gte: todayStart }),
    sumPaidPaymentRevenueRupees({ $gte: mom.previousStart, $lte: mom.previousEnd }),
    Payment.countDocuments({ status: "pending" }),
    Payment.countDocuments({ status: "failed" }),
    countLibrarySubscriptionOverview(),
    Payment.aggregate([
      { $match: { status: "paid" } },
      { $addFields: { paidAt: paidAtExpr(), amountPaise: mongoNormalizePaymentAmountExpr() } },
      { $match: { paidAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
          revenuePaise: { $sum: "$amountPaise" },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const growthPercent = computeGrowthPercent(monthlyRevenue, previousPeriodRevenue);

  const sparklineMap = new Map(
    sparklineAgg.map((r) => [String(r._id), roundRupees((r.revenuePaise || 0) / 100)])
  );
  const sparkline = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    sparkline.push({ date: key, revenue: sparklineMap.get(key) || 0 });
  }

  const statusCounts = { paid: 0, pending: 0, failed: 0, refunded: 0, cancelled: 0 };
  for (const row of statusAgg) {
    const k = String(row._id || "").toLowerCase();
    if (k in statusCounts) statusCounts[k] = Number(row.count || 0);
  }

  return {
    totalRevenue,
    monthlyRevenue,
    todayRevenue,
    growthPercent,
    pendingPayments: pendingCount,
    failedPayments: failedCount,
    activeSubscriptions: subscriptionCounts.activePlans,
    sparkline,
    subscriptionMix: {
      active: subscriptionCounts.activePlans,
      expired: subscriptionCounts.expired,
    },
    statusCounts,
  };
}

async function listPayments(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const search = String(query.search || "").trim();
  const status = String(query.paymentStatus || query.status || "all").trim().toLowerCase();
  const planRaw = String(query.planType || query.plan || "all").trim().toLowerCase();
  const libraryStatus = String(query.libraryStatus || "all").trim().toLowerCase();
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  const now = new Date();

  const match = {};

  if (status !== "all") {
    match.status = status;
  }

  if (planRaw === "pro") {
    match.plan = { $in: ["monthly", "6month", "yearly", "pro"] };
  } else if (planRaw === "trial") {
    match.plan = "trial";
  } else if (planRaw === "free" || planRaw === "none") {
    match.plan = "none";
  } else if (planRaw !== "all") {
    match.plan = planRaw;
  }

  if (from || to) {
    const dateFilter = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) dateFilter.$gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) dateFilter.$lte = d;
    }
    if (Object.keys(dateFilter).length) {
      match.createdAt = dateFilter;
    }
  }

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: "libraries",
        localField: "libraryId",
        foreignField: "_id",
        as: "library",
      },
    },
    { $unwind: "$library" },
    {
      $match: {
        "library.name": { $exists: true, $nin: [null, ""] },
      },
    },
  ];

  if (libraryStatus === "active") {
    pipeline.push({
      $match: {
        "library.isActive": true,
        $or: [{ "library.planExpiryDate": null }, { "library.planExpiryDate": { $gte: now } }],
      },
    });
  } else if (libraryStatus === "expired") {
    pipeline.push({
      $match: {
        $or: [{ "library.planExpiryDate": { $lt: now } }, { "library.isActive": false }],
      },
    });
  }

  if (search) {
    const rx = escapeRegex(search);
    pipeline.push({
      $match: {
        $or: [
          { orderId: { $regex: rx, $options: "i" } },
          { paymentId: { $regex: rx, $options: "i" } },
          { "library.name": { $regex: rx, $options: "i" } },
          { "library.ownerName": { $regex: rx, $options: "i" } },
          { "library.email": { $regex: rx, $options: "i" } },
          { "library.phone": { $regex: rx, $options: "i" } },
        ],
      },
    });
  }

  const countPipeline = [...pipeline, { $count: "total" }];
  const dataPipeline = [
    ...pipeline,
    { $sort: { createdAt: -1 } },
    { $skip: skip },
    { $limit: limit },
  ];

  const [countRes, rows] = await Promise.all([
    Payment.aggregate(countPipeline),
    Payment.aggregate(dataPipeline),
  ]);

  const total = Number(countRes?.[0]?.total || 0);

  const payments = rows.map((row) => {
    const lib = row.library || {};
    const expiry = lib.planExpiryDate ? new Date(lib.planExpiryDate) : null;
    const isExpired = expiry ? expiry.getTime() < now.getTime() : false;
    return {
      id: row._id.toString(),
      libraryId: row.libraryId?.toString?.() || null,
      libraryName: lib.name || "—",
      ownerName: lib.ownerName || "—",
      mobile: lib.phone || lib.whatsappNumber || "—",
      email: lib.email || "—",
      transactionId: row.orderId || "—",
      razorpayPaymentId: row.paymentId || "—",
      amount: paiseToRupees(row.amount),
      amountPaise: Number(row.amount || 0),
      planName: planLabel(row.plan),
      planKey: row.plan,
      status: row.status,
      paymentDate: row.verifiedAt?.toISOString?.() || row.createdAt?.toISOString?.() || null,
      expiryDate: lib.planExpiryDate?.toISOString?.() || null,
      subscriptionActive: !isExpired && Boolean(lib.isActive),
      isExpired,
    };
  });

  const totals = payments.reduce(
    (acc, p) => {
      if (p.status === "paid") {
        acc.successCount += 1;
        acc.totalRevenue += p.amount;
      } else if (p.status === "pending") {
        acc.pendingCount += 1;
        acc.pendingTotal += p.amount;
      } else if (p.status === "failed") {
        acc.failedCount += 1;
        acc.failedTotal += p.amount;
      }
      return acc;
    },
    {
      totalRevenue: 0,
      successCount: 0,
      pendingCount: 0,
      pendingTotal: 0,
      failedCount: 0,
      failedTotal: 0,
    }
  );

  return { payments, page, limit, total, totals };
}

async function getPaymentById(paymentId) {
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    const err = new Error("Invalid payment id");
    err.status = 400;
    throw err;
  }

  const row = await Payment.findById(paymentId).lean();
  if (!row) {
    const err = new Error("Payment not found");
    err.status = 404;
    throw err;
  }

  const lib = await Library.findById(row.libraryId)
    .select("name ownerName email phone whatsappNumber planExpiryDate isActive city state")
    .lean();

  const now = new Date();
  const expiry = lib?.planExpiryDate ? new Date(lib.planExpiryDate) : null;

  return {
    id: row._id.toString(),
    libraryId: row.libraryId?.toString?.() || null,
    libraryName: lib?.name || "—",
    ownerName: lib?.ownerName || "—",
    mobile: lib?.phone || lib?.whatsappNumber || "—",
    email: lib?.email || "—",
    transactionId: row.orderId,
    razorpayPaymentId: row.paymentId,
    amount: paiseToRupees(row.amount),
    planName: planLabel(row.plan),
    status: row.status,
    paymentDate: row.verifiedAt?.toISOString?.() || row.createdAt?.toISOString?.() || null,
    expiryDate: lib?.planExpiryDate?.toISOString?.() || null,
    subscriptionActive: expiry ? expiry.getTime() >= now.getTime() : false,
    createdAt: row.createdAt?.toISOString?.() || null,
  };
}

module.exports = {
  getPaymentsOverview,
  listPayments,
  getPaymentById,
};
