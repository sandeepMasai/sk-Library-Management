const mongoose = require("mongoose");
const StudentPayment = require("../models/StudentPayment");

function isFeeCollected(status) {
  const s = String(status ?? "").trim().toLowerCase();
  return s === "paid" || s === "partial";
}

/** Current calendar month in Asia/Kolkata (library operators are in India). */
function getMonthRange(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  })
    .formatToParts(date)
    .reduce((acc, p) => {
      if (p.type === "year" || p.type === "month") acc[p.type] = p.value;
      return acc;
    }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const start = new Date(
    `${year}-${String(month).padStart(2, "0")}-01T00:00:00+05:30`
  );
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = new Date(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+05:30`
  );
  return { start, end };
}

function inRange(d, start, end) {
  if (!d || Number.isNaN(d.getTime())) return false;
  return d >= start && d < end;
}

/**
 * Monthly collection =
 * 1) Sum paid/partial StudentPayment rows with paymentDate in current IST month
 * 2) Plus admission fees for paid students added this month (createdAt) with no admission payment yet
 * 3) Plus admission fees for paid students whose joinDate is this month (legacy rows without payment records)
 */
async function computeMonthlyCollection(libraryId, students = [], now = new Date()) {
  const libId = new mongoose.Types.ObjectId(String(libraryId));
  const { start, end } = getMonthRange(now);

  const [paymentAgg, admissionStudentIds] = await Promise.all([
    StudentPayment.aggregate([
      {
        $match: {
          libraryId: libId,
          paymentDate: { $gte: start, $lt: end },
          status: { $in: ["paid", "partial"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]),
    StudentPayment.distinct("studentId", {
      libraryId: libId,
      $or: [{ renewalRequestId: null }, { renewalRequestId: { $exists: false } }],
    }),
  ]);

  let total = Number(paymentAgg[0]?.total || 0);
  let paymentCount = Number(paymentAgg[0]?.count || 0);

  const hasAdmissionPayment = new Set(admissionStudentIds.map((id) => String(id)));

  let backfillCount = 0;
  for (const student of students) {
    if (!isFeeCollected(student.feeStatus)) continue;

    const studentId = String(student._id);
    if (hasAdmissionPayment.has(studentId)) continue;

    const createdAt = student.createdAt ? new Date(student.createdAt) : null;
    const joinDate = student.joinDate ? new Date(student.joinDate) : null;
    const addedThisMonth = inRange(createdAt, start, end) || inRange(joinDate, start, end);
    if (!addedThisMonth) continue;

    total += Number(student.feeAmount) || 0;
    backfillCount += 1;
    hasAdmissionPayment.add(studentId);
  }

  return {
    monthlyCollection: Math.max(0, total),
    monthlyPaymentCount: paymentCount + backfillCount,
  };
}

module.exports = {
  computeMonthlyCollection,
  getMonthRange,
  isFeeCollected,
};
