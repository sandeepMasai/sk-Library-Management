const mongoose = require("mongoose");

const PAYMENT_STATUS = ["paid", "partial", "pending", "refunded"];

const studentPaymentSchema = new mongoose.Schema(
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
    studentName: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    durationDays: {
      type: Number,
      required: true,
      enum: [30, 90, 180, 365],
    },
    paymentDate: { type: Date, required: true, default: Date.now },
    startDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: PAYMENT_STATUS,
      default: "paid",
      index: true,
    },
    feeMethod: {
      type: String,
      enum: ["cash", "upi"],
      default: "cash",
    },
    timing: { type: String, default: "", trim: true, maxlength: 120 },
    seatNumber: { type: Number, default: null },
    renewalRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RenewalRequest",
      default: null,
    },
    invoiceNumber: { type: String, required: true, trim: true, maxlength: 64 },
    note: { type: String, default: "", trim: true, maxlength: 500 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      default: null,
    },
  },
  { timestamps: true }
);

studentPaymentSchema.index({ libraryId: 1, paymentDate: -1 });
studentPaymentSchema.index({ studentId: 1, paymentDate: -1 });
studentPaymentSchema.index({ libraryId: 1, invoiceNumber: 1 }, { unique: true });

module.exports = mongoose.model("StudentPayment", studentPaymentSchema);
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
