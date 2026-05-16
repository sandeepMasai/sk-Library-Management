const mongoose = require("mongoose");
const Payment = require("../models/Payment");

/** Amounts wrongly saved as rupees (99) instead of paise (9900) before payment verify fix. */
const LEGACY_RUPEES_AMOUNTS = [99, 999, 4999, 9999, 10000];

/**
 * MongoDB expression: normalize Payment.amount to paise for $sum aggregations.
 */
function mongoNormalizePaymentAmountExpr() {
  return {
    $cond: {
      if: {
        $and: [
          { $gt: ["$amount", 0] },
          { $lt: ["$amount", 10000] },
          { $in: ["$amount", LEGACY_RUPEES_AMOUNTS] },
        ],
      },
      then: { $multiply: ["$amount", 100] },
      else: "$amount",
    },
  };
}

function normalizePaymentAmountPaise(amount) {
  const n = Math.round(Number(amount || 0));
  if (n > 0 && n < 10000 && LEGACY_RUPEES_AMOUNTS.includes(n)) {
    return n * 100;
  }
  return n;
}

/**
 * Convert stored Payment.amount → INR rupees for API responses.
 */
function paiseToRupees(amount) {
  return normalizePaymentAmountPaise(amount) / 100;
}

function roundRupees(rupees) {
  return Math.round(Number(rupees || 0) * 100) / 100;
}

/**
 * Total paid subscription revenue for one library (INR rupees).
 */
async function sumLibraryPaymentRevenueRupees(libraryId, extraMatch = {}) {
  if (!mongoose.Types.ObjectId.isValid(libraryId)) return 0;

  const agg = await Payment.aggregate([
    {
      $match: {
        libraryId: new mongoose.Types.ObjectId(String(libraryId)),
        status: "paid",
        ...extraMatch,
      },
    },
    { $addFields: { amountPaise: mongoNormalizePaymentAmountExpr() } },
    { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } },
  ]);

  return roundRupees((agg?.[0]?.totalPaise || 0) / 100);
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Fair MoM windows: May 1–16 vs Apr 1–16 (not full April vs partial May).
 */
function monthOverMonthPeriods(now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const compareDay = Math.min(now.getDate(), lastDayPrevMonth);
  const prevPeriodEnd = endOfDay(new Date(now.getFullYear(), now.getMonth() - 1, compareDay));

  return {
    currentStart: monthStart,
    currentEnd: endOfDay(now),
    previousStart: prevMonthStart,
    previousEnd: prevPeriodEnd,
  };
}

/**
 * Month-over-month growth % (same calendar period in previous month).
 */
function computeGrowthPercent(currentRevenue, previousRevenue) {
  const current = Number(currentRevenue || 0);
  const previous = Number(previousRevenue || 0);

  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  if (current <= 0) {
    return -100;
  }

  const raw = ((current - previous) / previous) * 100;
  return Math.round(raw * 10) / 10;
}

/**
 * Global paid payment revenue (INR rupees), optional paidAt filter: $gte, $lt, $lte.
 */
async function sumPaidPaymentRevenueRupees(dateRange = null) {
  const pipeline = [{ $match: { status: "paid" } }];

  if (dateRange) {
    const paidAt = { $ifNull: ["$verifiedAt", "$createdAt"] };
    const exprAnd = [];
    if (dateRange.$gte) {
      exprAnd.push({ $gte: [paidAt, dateRange.$gte] });
    }
    if (dateRange.$lt) {
      exprAnd.push({ $lt: [paidAt, dateRange.$lt] });
    }
    if (dateRange.$lte) {
      exprAnd.push({ $lte: [paidAt, dateRange.$lte] });
    }
    if (exprAnd.length) {
      pipeline.push({ $match: { $expr: { $and: exprAnd } } });
    }
  }

  pipeline.push(
    { $addFields: { amountPaise: mongoNormalizePaymentAmountExpr() } },
    { $group: { _id: null, totalPaise: { $sum: "$amountPaise" } } }
  );

  const agg = await Payment.aggregate(pipeline);
  return roundRupees((agg?.[0]?.totalPaise || 0) / 100);
}

module.exports = {
  LEGACY_RUPEES_AMOUNTS,
  mongoNormalizePaymentAmountExpr,
  normalizePaymentAmountPaise,
  paiseToRupees,
  roundRupees,
  endOfDay,
  monthOverMonthPeriods,
  computeGrowthPercent,
  sumLibraryPaymentRevenueRupees,
  sumPaidPaymentRevenueRupees,
};
