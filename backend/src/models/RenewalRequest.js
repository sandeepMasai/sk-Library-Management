const mongoose = require("mongoose");

const REQUEST_STATUS = ["pending", "approved", "rejected"];

const DURATION_DAYS = [30, 90, 180, 365];

const renewalRequestSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
      immutable: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
      immutable: true,
    },
    /** Snapshot at request time */
    studentName: { type: String, required: true, trim: true, maxlength: 120 },
    mobile: { type: String, required: true, trim: true, maxlength: 20 },
    seatNumber: { type: Number, default: null },
    currentExpiryDate: { type: Date, required: true },
    currentFeeAmount: { type: Number, default: 0, min: 0 },
    currentTiming: { type: String, default: "", trim: true, maxlength: 120 },
    currentShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    requestedDuration: {
      type: Number,
      required: true,
      enum: DURATION_DAYS,
    },
    /** Human-readable shift/timing label */
    requestedTiming: { type: String, required: true, trim: true, maxlength: 120 },
    requestedShiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shift",
      default: null,
    },
    note: { type: String, default: "", trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: REQUEST_STATUS,
      default: "pending",
      index: true,
    },
    rejectReason: { type: String, default: null, trim: true, maxlength: 500 },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      default: null,
    },
    approvedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    /** Set when approved */
    newExpiryDate: { type: Date, default: null },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentPayment",
      default: null,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notification",
      default: null,
    },
  },
  { timestamps: true }
);

renewalRequestSchema.index({ libraryId: 1, status: 1, createdAt: -1 });
renewalRequestSchema.index({ studentId: 1, createdAt: -1 });
renewalRequestSchema.index(
  { libraryId: 1, studentId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "pending" },
  }
);

module.exports = mongoose.model("RenewalRequest", renewalRequestSchema);
module.exports.REQUEST_STATUS = REQUEST_STATUS;
module.exports.DURATION_DAYS = DURATION_DAYS;
