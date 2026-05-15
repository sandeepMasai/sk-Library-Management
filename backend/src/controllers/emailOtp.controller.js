const asyncHandler = require("../utils/asyncHandler");
const {
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  sendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  completeForgotPasswordReset,
} = require("../services/emailOtp.service");
const Library = require("../models/Library");
const Student = require("../models/Student");
const logger = require("../utils/logger");
const { createHttpError } = require("../utils/httpError");

/**
 * Get request metadata
 */
function getRequestMeta(req) {
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

/**
 * POST /api/auth/send-email-otp
 * Send OTP to email for verification
 */
const sendEmailOtpHandler = asyncHandler(async (req, res) => {
  const { email, purpose = "verification", role } = req.body;
  const meta = getRequestMeta(req);

  if (!email) {
    throw createHttpError(400, "Email is required");
  }

  // Check for duplicate email based on role
  if (role === "library") {
    const existingLibrary = await Library.findOne({ email: email.trim().toLowerCase() });
    if (existingLibrary) {
      throw createHttpError(409, "Email already registered");
    }
  } else if (role === "student") {
    const existingStudent = await Student.findOne({ email: email.trim().toLowerCase() });
    if (existingStudent) {
      throw createHttpError(409, "Email already registered");
    }
  }

  const result = await sendEmailOtp({
    email,
    purpose,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    appName: "SmartLibDesk",
  });

  res.json({
    ok: true,
    message: result.message,
    expiryMinutes: result.expiryMinutes,
    resendAfterSeconds: result.resendAfterSeconds,
  });
});

/**
 * POST /api/auth/verify-email-otp
 * Verify OTP sent to email
 */
const verifyEmailOtpHandler = asyncHandler(async (req, res) => {
  const { email, otp, purpose = "verification" } = req.body;
  const meta = getRequestMeta(req);

  if (!email || !otp) {
    throw createHttpError(400, "Email and OTP are required");
  }

  // Find user by email
  const normalizedEmail = email.trim().toLowerCase();
  let user = null;

  // Try Library first
  user = await Library.findOne({ email: normalizedEmail });
  
  // If not found, try Student
  if (!user) {
    user = await Student.findOne({ email: normalizedEmail });
  }

  const result = await verifyEmailOtp({
    email,
    otp,
    purpose,
    user,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  res.json({
    ok: true,
    message: result.message,
  });
});

/**
 * POST /api/auth/resend-email-otp
 * Resend OTP to email
 */
const resendEmailOtpHandler = asyncHandler(async (req, res) => {
  const { email, purpose = "verification" } = req.body;
  const meta = getRequestMeta(req);

  if (!email) {
    throw createHttpError(400, "Email is required");
  }

  const result = await resendEmailOtp({
    email,
    purpose,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    appName: "SmartLibDesk",
  });

  res.json({
    ok: true,
    message: result.message,
    expiryMinutes: result.expiryMinutes,
    resendAfterSeconds: result.resendAfterSeconds,
  });
});

/**
 * POST /api/auth/forgot-password/send-otp
 * Send 6-digit password reset OTP (no link).
 */
const forgotPasswordSendOtpHandler = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const meta = getRequestMeta(req);

  if (!email) {
    throw createHttpError(400, "Email is required");
  }

  try {
    const result = await sendForgotPasswordEmailOtp({
      email: String(email).trim(),
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      appName: "SmartLibDesk",
    });

    return res.json({
      ok: true,
      message: result.message,
      expiryMinutes: result.expiryMinutes,
      resendAfterSeconds: result.resendAfterSeconds,
    });
  } catch (error) {
    logger.error("Forgot-password send OTP failed", { message: error.message });
    throw error;
  }
});

/**
 * POST /api/auth/forgot-password/verify-otp
 * Verify OTP; returns one-time resetSessionToken (not emailed).
 */
const forgotPasswordVerifyOtpHandler = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const meta = getRequestMeta(req);

  if (!email || !otp) {
    throw createHttpError(400, "Email and OTP are required");
  }

  const result = await verifyForgotPasswordEmailOtp({
    email: String(email).trim(),
    otp: String(otp).trim(),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  res.json({
    ok: true,
    resetSessionToken: result.resetSessionToken,
    sessionExpiresMinutes: result.sessionExpiresMinutes,
  });
});

/**
 * POST /api/auth/forgot-password/reset-password
 * Final step: consume session token + set new password.
 */
const forgotPasswordResetPasswordHandler = asyncHandler(async (req, res) => {
  const { email, resetSessionToken, newPassword } = req.body;
  const meta = getRequestMeta(req);

  const result = await completeForgotPasswordReset({
    email: String(email || "").trim(),
    resetSessionToken: String(resetSessionToken || "").trim(),
    newPassword: String(newPassword || "").trim(),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  res.json({
    ok: true,
    message: result.message,
  });
});

/**
 * POST /api/library/send-verification-email
 * Send verification email for library (authenticated)
 */
const sendLibraryVerificationEmail = asyncHandler(async (req, res) => {
  const library = req.library;
  const meta = getRequestMeta(req);

  if (!library.email) {
    throw createHttpError(400, "Library email not found");
  }

  if (library.isEmailVerified) {
    return res.json({
      ok: true,
      message: "Email is already verified",
      isEmailVerified: true,
    });
  }

  const result = await sendEmailOtp({
    email: library.email,
    purpose: "verification",
    userId: library._id.toString(),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    appName: "SmartLibDesk",
  });

  res.json({
    ok: true,
    message: result.message,
    expiryMinutes: result.expiryMinutes,
    resendAfterSeconds: result.resendAfterSeconds,
    isEmailVerified: library.isEmailVerified,
  });
});

/**
 * POST /api/student/me/send-verification-email
 * Send verification email for student (authenticated)
 */
const sendStudentVerificationEmail = asyncHandler(async (req, res) => {
  const student = req.student;
  const meta = getRequestMeta(req);

  if (!student.email) {
    throw createHttpError(400, "Student email not found. Please add your email address first.");
  }

  if (student.isEmailVerified) {
    return res.json({
      ok: true,
      message: "Email is already verified",
      isEmailVerified: true,
    });
  }

  const result = await sendEmailOtp({
    email: student.email,
    purpose: "verification",
    userId: student._id.toString(),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    appName: "SmartLibDesk",
  });

  res.json({
    ok: true,
    message: result.message,
    expiryMinutes: result.expiryMinutes,
    resendAfterSeconds: result.resendAfterSeconds,
    isEmailVerified: student.isEmailVerified,
  });
});

/**
 * POST /api/library/verify-email
 * Verify email OTP for library (authenticated)
 */
const verifyLibraryEmail = asyncHandler(async (req, res) => {
  const library = req.library;
  const { otp } = req.body;
  const meta = getRequestMeta(req);

  if (!otp) {
    throw createHttpError(400, "OTP is required");
  }

  if (!library.email) {
    throw createHttpError(400, "Library email not found");
  }

  const result = await verifyEmailOtp({
    email: library.email,
    otp,
    purpose: "verification",
    user: library,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  const fresh = await Library.findById(library._id).lean();

  res.json({
    ok: true,
    message: result.message,
    isEmailVerified: Boolean(fresh?.isEmailVerified),
    emailVerifiedAt: fresh?.emailVerifiedAt || null,
  });
});

/**
 * POST /api/student/me/verify-email
 * Verify email OTP for student (authenticated)
 */
const verifyStudentEmail = asyncHandler(async (req, res) => {
  const student = req.student;
  const { otp } = req.body;
  const meta = getRequestMeta(req);

  if (!otp) {
    throw createHttpError(400, "OTP is required");
  }

  if (!student.email) {
    throw createHttpError(400, "Student email not found");
  }

  const result = await verifyEmailOtp({
    email: student.email,
    otp,
    purpose: "verification",
    user: student,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });

  const fresh = await Student.findById(student._id).lean();

  res.json({
    ok: true,
    message: result.message,
    isEmailVerified: Boolean(fresh?.isEmailVerified),
  });
});

module.exports = {
  sendEmailOtpHandler,
  verifyEmailOtpHandler,
  resendEmailOtpHandler,
  forgotPasswordSendOtpHandler,
  forgotPasswordVerifyOtpHandler,
  forgotPasswordResetPasswordHandler,
  sendLibraryVerificationEmail,
  sendStudentVerificationEmail,
  verifyLibraryEmail,
  verifyStudentEmail,
};
