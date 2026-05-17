const mongoose = require("mongoose");
const Student = require("../models/Student");
const Seat = require("../models/Seat");
const Shift = require("../models/Shift");
const SeatAllocation = require("../models/SeatAllocation");
const Notification = require("../models/Notification");
const RenewalRequest = require("../models/RenewalRequest");
const StudentPayment = require("../models/StudentPayment");
const {
  computeRenewalExpiry,
  durationLabel,
  generateInvoiceNumber,
} = require("../utils/renewal");

async function getStudentSeatAndTiming(libraryId, studentId) {
  const [seat, allocation] = await Promise.all([
    Seat.findOne({ libraryId, studentId, status: "occupied" }).select("number").lean(),
    SeatAllocation.findOne({ libraryId, studentId, status: "active" })
      .select("shiftId")
      .sort({ endDate: -1 })
      .lean(),
  ]);

  let shift = null;
  if (allocation?.shiftId) {
    shift = await Shift.findById(allocation.shiftId).select("name").lean();
  }

  return {
    seatNumber: seat?.number ?? null,
    currentTiming: shift?.name || "",
    currentShiftId: shift?._id || allocation?.shiftId || null,
  };
}

function formatRequest(doc) {
  return {
    id: doc._id.toString(),
    libraryId: doc.libraryId?.toString?.() || null,
    studentId: doc.studentId?.toString?.() || null,
    studentName: doc.studentName,
    mobile: doc.mobile,
    seatNumber: doc.seatNumber ?? null,
    currentExpiryDate: doc.currentExpiryDate?.toISOString?.() || null,
    currentFeeAmount: doc.currentFeeAmount ?? 0,
    currentTiming: doc.currentTiming || "",
    requestedDuration: doc.requestedDuration,
    requestedDurationLabel: durationLabel(doc.requestedDuration),
    requestedTiming: doc.requestedTiming,
    note: doc.note || "",
    status: doc.status,
    rejectReason: doc.rejectReason || null,
    newExpiryDate: doc.newExpiryDate?.toISOString?.() || null,
    paymentId: doc.paymentId?.toString?.() || null,
    createdAt: doc.createdAt?.toISOString?.() || null,
    updatedAt: doc.updatedAt?.toISOString?.() || null,
    approvedAt: doc.approvedAt?.toISOString?.() || null,
    rejectedAt: doc.rejectedAt?.toISOString?.() || null,
  };
}

/** Approved renewal charges are completed payments — always show as paid (not fee dues). */
function resolvePaymentDisplayStatus(doc) {
  const raw = String(doc?.status || "").trim().toLowerCase();
  if (raw === "refunded") return "refunded";
  if (doc?.renewalRequestId) return "paid";
  if (raw === "partial") return "partial";
  if (raw === "pending") return "pending";
  return "paid";
}

function formatPayment(doc) {
  return {
    id: doc._id.toString(),
    libraryId: doc.libraryId?.toString?.() || null,
    studentId: doc.studentId?.toString?.() || null,
    studentName: doc.studentName,
    amount: doc.amount,
    durationDays: doc.durationDays,
    durationLabel: durationLabel(doc.durationDays),
    paymentDate: doc.paymentDate?.toISOString?.() || null,
    startDate: doc.startDate?.toISOString?.() || null,
    expiryDate: doc.expiryDate?.toISOString?.() || null,
    status: resolvePaymentDisplayStatus(doc),
    feeMethod: doc.feeMethod || "cash",
    timing: doc.timing || "",
    seatNumber: doc.seatNumber ?? null,
    invoiceNumber: doc.invoiceNumber,
    note: doc.note || "",
    renewalRequestId: doc.renewalRequestId?.toString?.() || null,
    createdAt: doc.createdAt?.toISOString?.() || null,
  };
}

async function notifyLibraryRenewalRequest({ libraryId, studentName, requestId }) {
  const doc = await Notification.create({
    libraryId,
    title: "Student requested plan renewal",
    message: `${studentName} requested a plan renewal/extension. Review in Renewal Requests.`,
    date: new Date(),
    targetType: "library",
    category: "renewal",
    priority: "high",
  });
  if (requestId) {
    await RenewalRequest.updateOne(
      { _id: requestId },
      { $set: { notificationId: doc._id } }
    );
  }
  return doc;
}

async function notifyStudentRenewalResult({ libraryId, studentId, title, message }) {
  return Notification.create({
    libraryId,
    title,
    message,
    date: new Date(),
    targetType: "student",
    targetId: studentId,
    category: "renewal",
    priority: "normal",
  });
}

async function createRenewalRequest({
  libraryId,
  studentId,
  requestedDuration,
  requestedTiming,
  requestedShiftId,
  note,
}) {
  const student = await Student.findOne({
    _id: studentId,
    libraryId,
    isDeleted: false,
  });
  if (!student) {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }
  if (student.isBlocked) {
    const err = new Error("Account is blocked");
    err.statusCode = 403;
    throw err;
  }

  const existingPending = await RenewalRequest.findOne({
    libraryId,
    studentId,
    status: "pending",
  }).lean();
  if (existingPending) {
    const err = new Error("You already have a pending renewal request");
    err.statusCode = 409;
    throw err;
  }

  const { seatNumber, currentTiming, currentShiftId } = await getStudentSeatAndTiming(
    libraryId,
    studentId
  );

  let shiftId = requestedShiftId || currentShiftId;
  let timingLabel = String(requestedTiming || "").trim();
  if (shiftId && mongoose.Types.ObjectId.isValid(String(shiftId))) {
    const shift = await Shift.findOne({ _id: shiftId, libraryId }).lean();
    if (shift) timingLabel = shift.name;
  }
  if (!timingLabel) timingLabel = currentTiming || "Not specified";

  const request = await RenewalRequest.create({
    libraryId,
    studentId,
    studentName: student.name,
    mobile: student.mobile,
    seatNumber,
    currentExpiryDate: student.expiryDate,
    currentFeeAmount: student.feeAmount,
    currentTiming: currentTiming || "",
    currentShiftId,
    requestedDuration,
    requestedTiming: timingLabel,
    requestedShiftId: shiftId || null,
    note: String(note || "").trim(),
    status: "pending",
  });

  await notifyLibraryRenewalRequest({
    libraryId,
    studentName: student.name,
    requestId: request._id,
  });

  return formatRequest(request.toObject());
}

async function approveRenewalRequest({
  libraryId,
  requestId,
  reviewerId,
  amount,
  feeStatus,
  feeMethod,
}) {
  const request = await RenewalRequest.findOne({
    _id: requestId,
    libraryId,
    status: "pending",
  });
  if (!request) {
    const err = new Error("Renewal request not found or already processed");
    err.statusCode = 404;
    throw err;
  }

  const student = await Student.findOne({
    _id: request.studentId,
    libraryId,
    isDeleted: false,
  });
  if (!student) {
    const err = new Error("Student not found");
    err.statusCode = 404;
    throw err;
  }

  const { startDate, expiryDate } = computeRenewalExpiry(
    student.expiryDate,
    request.requestedDuration
  );

  const payAmount =
    amount != null && Number.isFinite(Number(amount))
      ? Math.max(0, Number(amount))
      : Number(student.feeAmount) || 0;

  const normalizedFeeStatus = (() => {
    const raw = String(feeStatus ?? "paid").trim().toLowerCase();
    if (raw === "partial" || raw === "half paid") return "partial";
    if (raw === "pending") return "pending";
    return "paid";
  })();

  const invoiceNumber = generateInvoiceNumber(libraryId, student._id);

  // Payment history = completed renewal (always paid). Fee dues tracked on student row.
  const payment = await StudentPayment.create({
    libraryId,
    studentId: student._id,
    studentName: student.name,
    amount: payAmount,
    durationDays: request.requestedDuration,
    paymentDate: new Date(),
    startDate,
    expiryDate,
    status: "paid", // completed renewal charge (fee dues live on student.feeStatus only)
    feeMethod: feeMethod === "upi" ? "upi" : "cash",
    timing: request.requestedTiming,
    seatNumber: request.seatNumber,
    renewalRequestId: request._id,
    invoiceNumber,
    note: `Renewal approved — ${durationLabel(request.requestedDuration)}`,
    createdBy: reviewerId || null,
  });

  if (payment.status !== "paid") {
    payment.status = "paid";
    await payment.save();
  }

  student.expiryDate = expiryDate;
  student.feeAmount = payAmount;
  // Default to paid when extending plan unless librarian marks partial/pending dues.
  student.feeStatus =
    normalizedFeeStatus === "pending" || normalizedFeeStatus === "partial"
      ? normalizedFeeStatus
      : "paid";
  if (feeMethod === "upi" || feeMethod === "cash") {
    student.feeMethod = feeMethod;
  }
  await student.save();

  request.status = "approved";
  request.approvedBy = reviewerId || null;
  request.approvedAt = new Date();
  request.newExpiryDate = expiryDate;
  request.paymentId = payment._id;
  await request.save();

  const expiryStr = expiryDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  await notifyStudentRenewalResult({
    libraryId,
    studentId: student._id,
    title: "Plan renewed",
    message: `Your membership has been extended until ${expiryStr}. Amount: ₹${payAmount}.`,
  });

  return {
    request: formatRequest(request.toObject()),
    payment: formatPayment(payment.toObject()),
    student: {
      id: student._id.toString(),
      expiryDate: student.expiryDate.toISOString(),
      feeStatus: student.feeStatus,
      feeAmount: student.feeAmount,
    },
  };
}

async function rejectRenewalRequest({ libraryId, requestId, reviewerId, reason }) {
  const request = await RenewalRequest.findOne({
    _id: requestId,
    libraryId,
    status: "pending",
  });
  if (!request) {
    const err = new Error("Renewal request not found or already processed");
    err.statusCode = 404;
    throw err;
  }

  request.status = "rejected";
  request.rejectedBy = reviewerId || null;
  request.rejectedAt = new Date();
  request.rejectReason = String(reason || "").trim() || "Request declined by library";
  await request.save();

  await notifyStudentRenewalResult({
    libraryId,
    studentId: request.studentId,
    title: "Renewal request declined",
    message: request.rejectReason,
  });

  return formatRequest(request.toObject());
}

module.exports = {
  getStudentSeatAndTiming,
  formatRequest,
  formatPayment,
  resolvePaymentDisplayStatus,
  createRenewalRequest,
  approveRenewalRequest,
  rejectRenewalRequest,
  durationLabel,
};
