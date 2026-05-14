/**
 * HTTP handlers for MSG91-backed OTP flows:
 * - Generic login OTP (student / library)
 * - Library forgot-password OTP + password reset
 *
 * All routes use asyncHandler + structured sendSuccess responses.
 */

"use strict";

const Library = require("../models/Library");
const Student = require("../models/Student");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const { createHttpError } = require("../utils/httpError");
const otpService = require("../services/otp.service");
const { assertIndianMobileBody } = require("../utils/mobile");
const authService = require("../services/auth.service");
const { hashPassword } = require("../utils/authCredentials");
const { signPasswordResetToken, verifyPasswordResetToken } = require("../utils/token");
const logger = require("../utils/logger");

function getRequestMeta(req) {
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function otpExpiryMinutes() {
  return Number.parseInt(process.env.MSG91_OTP_EXPIRY_MINUTES || "5", 10) || 5;
}

/**
 * POST /api/otp/send-otp
 * Body: { mobile, role: "student"|"library", libraryCode?: string (required for student) }
 */
const sendOtp = asyncHandler(async (req, res) => {
  const role = String(req.body?.role || "").trim().toLowerCase();
  const mobile10 = assertIndianMobileBody(req.body?.mobile);
  if (role !== "student" && role !== "library") {
    throw createHttpError(400, 'role must be "student" or "library"');
  }

  otpService.assertMsg91Configured();

  let mobileKey;
  if (role === "library") {
    const lib = await Library.findOne({ phone: mobile10 }).lean();
    if (!lib) {
      throw createHttpError(404, "No library account found for this mobile number.");
    }
    otpService.assertNotOtpBlocked(lib);
    mobileKey = `library_login:${mobile10}`;
  } else {
    const libraryCode = String(req.body?.libraryCode || "").trim().toUpperCase();
    if (!libraryCode) {
      throw createHttpError(400, "libraryCode is required for student OTP login.");
    }
    const library = await Library.findOne({ libraryCode }).select("_id").lean();
    if (!library) {
      throw createHttpError(404, "Invalid library code.");
    }
    const student = await Student.findOne({
      libraryId: library._id,
      mobile: mobile10,
      isDeleted: false,
    }).lean();
    if (!student) {
      throw createHttpError(404, "No student found for this mobile in the given library.");
    }
    otpService.assertNotOtpBlocked(student);
    mobileKey = `student_login:${String(library._id)}:${mobile10}`;
  }

  const meta = getRequestMeta(req);
  await otpService.enforceSendPolicies({ mobileKey, ip: meta.ip });
  await otpService.dispatchMsg91Otp(mobile10);
  await otpService.logSend({
    mobileKey,
    purpose: role === "library" ? "library_login" : "student_login",
    ip: meta.ip,
  });

  logger.info("OTP send accepted", { role, mobile10, mobileKey: mobileKey.split(":").slice(0, 2).join(":") });

  return sendSuccess(
    res,
    {
      mobile: mobile10,
      role,
      resendAfterSeconds: Math.ceil(otpService.RESEND_COOLDOWN_MS / 1000),
      otpExpiresInMinutes: otpExpiryMinutes(),
    },
    "OTP sent successfully",
    200
  );
});

/**
 * POST /api/otp/verify-otp
 * Body: { mobile, role, otp, libraryCode?: string }
 * On success: JWT + refresh (same shape as /api/auth/login).
 */
const verifyOtp = asyncHandler(async (req, res) => {
  const role = String(req.body?.role || "").trim().toLowerCase();
  const mobile10 = assertIndianMobileBody(req.body?.mobile);
  const otp = String(req.body?.otp || "").trim();
  if (!/^\d{4,8}$/.test(otp.replace(/\D/g, ""))) {
    throw createHttpError(400, "Invalid OTP format");
  }
  if (role !== "student" && role !== "library") {
    throw createHttpError(400, 'role must be "student" or "library"');
  }

  otpService.assertMsg91Configured();
  const meta = getRequestMeta(req);
  const otpDigits = otp.replace(/\D/g, "");

  if (role === "library") {
    const lib = await Library.findOne({ phone: mobile10 });
    if (!lib) {
      throw createHttpError(404, "No library account found for this mobile number.");
    }
    otpService.assertNotOtpBlocked(lib);
    const ok = await otpService.verifyMsg91Otp(mobile10, otpDigits);
    if (!ok) {
      await otpService.recordVerifyFailure(Library, lib._id);
      throw createHttpError(400, "Invalid or expired OTP");
    }
    await otpService.resetOtpGateOnSuccess(Library, lib._id);
    const fresh = await Library.findById(lib._id);
    const session = await authService.issueLibrarySession(fresh, meta);
    logger.info("Library OTP login success", { userId: session.user?.id });
    return sendSuccess(res, session, "OTP verified — logged in", 200);
  }

  const libraryCode = String(req.body?.libraryCode || "").trim().toUpperCase();
  if (!libraryCode) {
    throw createHttpError(400, "libraryCode is required for student OTP verification.");
  }
  const library = await Library.findOne({ libraryCode }).select("_id").lean();
  if (!library) {
    throw createHttpError(404, "Invalid library code.");
  }
  const student = await Student.findOne({
    libraryId: library._id,
    mobile: mobile10,
    isDeleted: false,
  });
  if (!student) {
    throw createHttpError(404, "No student found for this mobile in the given library.");
  }
  otpService.assertNotOtpBlocked(student);
  const ok = await otpService.verifyMsg91Otp(mobile10, otpDigits);
  if (!ok) {
    await otpService.recordVerifyFailure(Student, student._id);
    throw createHttpError(400, "Invalid or expired OTP");
  }
  await otpService.resetOtpGateOnSuccess(Student, student._id);
  const freshStudent = await Student.findById(student._id);
  const session = await authService.issueStudentSession(freshStudent, meta);
  logger.info("Student OTP login success", { userId: session.user?.id, libraryId: String(library._id) });
  return sendSuccess(res, session, "OTP verified — logged in", 200);
});

/**
 * POST /api/auth/forgot-password/send-otp
 * Body: { mobile } — library account must have same registered phone.
 */
const forgotPasswordSendOtp = asyncHandler(async (req, res) => {
  const mobile10 = assertIndianMobileBody(req.body?.mobile);
  otpService.assertMsg91Configured();

  const lib = await Library.findOne({ phone: mobile10 }).lean();
  if (!lib) {
    throw createHttpError(404, "No library account found for this mobile number.");
  }
  otpService.assertNotOtpBlocked(lib);

  const mobileKey = `library_forgot:${mobile10}`;
  const meta = getRequestMeta(req);
  await otpService.enforceSendPolicies({ mobileKey, ip: meta.ip });
  await otpService.dispatchMsg91Otp(mobile10);
  await otpService.logSend({ mobileKey, purpose: "library_forgot_password", ip: meta.ip });

  logger.info("Forgot-password OTP sent", { mobile10 });

  return sendSuccess(
    res,
    {
      mobile: mobile10,
      resendAfterSeconds: Math.ceil(otpService.RESEND_COOLDOWN_MS / 1000),
      otpExpiresInMinutes: otpExpiryMinutes(),
    },
    "OTP sent successfully",
    200
  );
});

/**
 * POST /api/auth/forgot-password/verify-otp
 * Body: { mobile, otp }
 * Returns short-lived resetToken (JWT) for POST /api/auth/reset-password
 */
const forgotPasswordVerifyOtp = asyncHandler(async (req, res) => {
  const mobile10 = assertIndianMobileBody(req.body?.mobile);
  const otp = String(req.body?.otp || "").trim();
  if (!/^\d{4,8}$/.test(otp.replace(/\D/g, ""))) {
    throw createHttpError(400, "Invalid OTP format");
  }
  otpService.assertMsg91Configured();

  const lib = await Library.findOne({ phone: mobile10 });
  if (!lib) {
    throw createHttpError(404, "No library account found for this mobile number.");
  }
  otpService.assertNotOtpBlocked(lib);

  const ok = await otpService.verifyMsg91Otp(mobile10, otp.replace(/\D/g, ""));
  if (!ok) {
    await otpService.recordVerifyFailure(Library, lib._id);
    throw createHttpError(400, "Invalid or expired OTP");
  }
  await otpService.resetOtpGateOnSuccess(Library, lib._id);

  const resetToken = signPasswordResetToken({ userId: lib._id.toString(), role: "library" });
  logger.info("Forgot-password OTP verified", { userId: String(lib._id) });

  return sendSuccess(
    res,
    {
      resetToken,
      resetTokenExpiresInMinutes: 15,
    },
    "OTP verified — you can set a new password",
    200
  );
});

/**
 * POST /api/auth/reset-password
 * Body: { resetToken, newPassword }
 */
const resetPasswordWithToken = asyncHandler(async (req, res) => {
  const resetToken = String(req.body?.resetToken || req.body?.token || "").trim();
  const newPassword = String(req.body?.newPassword || "").trim();
  if (!resetToken) {
    throw createHttpError(400, "resetToken is required");
  }
  if (newPassword.length < 6) {
    throw createHttpError(400, "Password must be at least 6 characters");
  }

  let payload;
  try {
    payload = verifyPasswordResetToken(resetToken);
  } catch (e) {
    throw createHttpError(400, "Invalid or expired reset token");
  }
  if (payload.role !== "library") {
    throw createHttpError(400, "Invalid reset token");
  }

  const library = await Library.findById(payload.userId).select("+passwordHash");
  if (!library) {
    throw createHttpError(404, "Library not found");
  }

  const passwordHash = await hashPassword(newPassword, 10);
  library.passwordHash = passwordHash;
  library.otpAttempts = 0;
  library.otpBlockedUntil = null;
  await library.save();

  logger.info("Password reset via OTP flow", { userId: String(library._id) });

  return sendSuccess(res, { ok: true }, "Password updated successfully", 200);
});

module.exports = {
  sendOtp,
  verifyOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPasswordWithToken,
};
