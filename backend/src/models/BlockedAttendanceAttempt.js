const mongoose = require("mongoose");

const blockedAttendanceAttemptSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    studentName: { type: String, required: true, trim: true, maxlength: 120 },
    membershipExpiryDate: { type: Date, default: null },
    reason: {
      type: String,
      enum: ["expired", "unpaid", "blocked"],
      default: "expired",
      index: true,
    },
    attemptedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: false, strict: true }
);

blockedAttendanceAttemptSchema.index({ libraryId: 1, attemptedAt: -1 });

module.exports = mongoose.model("BlockedAttendanceAttempt", blockedAttendanceAttemptSchema);
