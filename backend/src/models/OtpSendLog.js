/**
 * OTP send audit + rate-limit source of truth.
 * Each document records one outbound OTP request (MSG91 or mock).
 * TTL index auto-deletes rows after 24h to cap collection growth while
 * keeping enough history for abuse investigations.
 */
const mongoose = require("mongoose");

const otpSendLogSchema = new mongoose.Schema(
  {
    /** Normalized key, e.g. `student:<libraryId>:9876543210` or `library:9876543210` */
    mobileKey: { type: String, required: true, index: true },
    purpose: { type: String, required: true, maxlength: 64 },
    ip: { type: String, default: "", maxlength: 128 },
  },
  { timestamps: true }
);

otpSendLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("OtpSendLog", otpSendLogSchema);
