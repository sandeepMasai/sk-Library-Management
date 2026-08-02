const EmailOtp = require("../models/EmailOtp");
const PasswordResetSession = require("../models/PasswordResetSession");
const LibraryRegistrationSession = require("../models/LibraryRegistrationSession");
const Library = require("../models/Library");
const Student = require("../models/Student");
const {
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  sendVerificationSuccessEmail,
  parseResendError,
} = require("./email.service");
const { hashPassword } = require("../utils/authCredentials");
const logger = require("../utils/logger");
const { createHttpError } = require("../utils/httpError");

// Configuration
const EMAIL_OTP_LENGTH = Number.parseInt(process.env.EMAIL_OTP_LENGTH || "6", 10) || 6;
const EMAIL_OTP_EXPIRY_MINUTES = Number.parseInt(process.env.EMAIL_OTP_EXPIRY_MINUTES || "5", 10) || 5;
const EMAIL_OTP_MAX_ATTEMPTS = Number.parseInt(process.env.EMAIL_OTP_MAX_ATTEMPTS || "5", 10) || 5;
const EMAIL_OTP_RESEND_COOLDOWN_SECONDS = Number.parseInt(process.env.EMAIL_OTP_RESEND_COOLDOWN_SECONDS || "60", 10) || 60;
const PASSWORD_RESET_SESSION_TTL_MINUTES =
  Number.parseInt(process.env.PASSWORD_RESET_SESSION_TTL_MINUTES || "10", 10) || 10;
const LIBRARY_REGISTRATION_SESSION_TTL_MINUTES =
  Number.parseInt(process.env.LIBRARY_REGISTRATION_SESSION_TTL_MINUTES || "30", 10) || 30;

const FORGOT_PASSWORD_GENERIC_OK =
  "If an account exists for this email, a reset code has been sent.";

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 */
function validateEmail(email) {
  if (!email || typeof email !== "string") {
    return false;
  }
  return EMAIL_REGEX.test(email.trim().toLowerCase());
}

/**
 * Mark email verified on the Library / Student document after OTP matches.
 * Per-attempt limits are enforced on the EmailOtp document (hashed OTP rows).
 */
function applyEmailVerifiedToUser(user) {
  if (!user) return;
  user.isEmailVerified = true;
  if (user.constructor.modelName === "Library") {
    user.emailVerifiedAt = new Date();
  }
}

/**
 * Send OTP email
 */
async function sendEmailOtp({
  email,
  purpose = "verification",
  userId = null,
  ipAddress = null,
  userAgent = null,
  appName = "SmartLibDesk",
}) {
  // Validate email
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Check resend cooldown
  const cooldownCheck = await EmailOtp.canRequestOtp({
    email: normalizedEmail,
    purpose,
    cooldownSeconds: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  });

  if (!cooldownCheck.canRequest) {
    throw createHttpError(
      429,
      `Please wait ${cooldownCheck.cooldownRemaining} seconds before requesting another OTP.`,
      { code: "RESEND_COOLDOWN", cooldownRemaining: cooldownCheck.cooldownRemaining }
    );
  }

  // Generate OTP (password reset is always 6 digits)
  const otpLength = purpose === "password_reset" ? 6 : EMAIL_OTP_LENGTH;
  const otp = EmailOtp.generateOtp(otpLength);

  // Create EmailOTP record
  await EmailOtp.createEmailOtp({
    email: normalizedEmail,
    otp,
    purpose,
    expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
    ipAddress,
    userAgent,
    userId,
  });

  // Send email
  try {
    if (purpose === "password_reset") {
      await sendPasswordResetOtpEmail({
        to: normalizedEmail,
        otp,
        expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
        appName,
      });
    } else {
      await sendOtpEmail({
        to: normalizedEmail,
        otp,
        expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
        appName,
      });
    }

    logger.info("Email OTP sent successfully", {
      email: normalizedEmail,
      purpose,
      ipAddress,
    });

    return {
      success: true,
      message: "OTP sent successfully",
      expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
      resendAfterSeconds: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
    };
  } catch (error) {
    const parsed = parseResendError(error);
    logger.error("Failed to send email OTP", {
      email: normalizedEmail,
      purpose,
      error: parsed.message,
      code: parsed.code,
    });

    if (
      parsed.code === "RESEND_NOT_CONFIGURED" ||
      parsed.code === "RESEND_SANDBOX_RECIPIENT" ||
      parsed.code === "RESEND_DOMAIN_NOT_VERIFIED"
    ) {
      throw createHttpError(503, parsed.message, { code: parsed.code });
    }

    throw createHttpError(500, "Failed to send OTP. Please try again later.", { code: parsed.code });
  }
}

/**
 * Verify OTP email
 */
async function verifyEmailOtp({
  email,
  otp,
  purpose = "verification",
  user = null,
  ipAddress = null,
  userAgent = null,
}) {
  // Validate email
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }

  // Validate OTP format
  const normalizedOtp = String(otp).trim();
  const isPasswordReset = purpose === "password_reset";
  const isLibraryRegister = purpose === "library_register";
  if (!otp || !(isPasswordReset ? /^\d{6}$/.test(normalizedOtp) : /^\d{4,8}$/.test(normalizedOtp))) {
    throw createHttpError(400, isPasswordReset ? "OTP must be exactly 6 digits" : "Invalid OTP format");
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Verify OTP
  const result = await EmailOtp.verifyEmailOtp({
    email: normalizedEmail,
    otp: normalizedOtp,
    purpose,
    ipAddress,
    userAgent,
  });

  if (!result.success) {
    logger.warn("Email OTP verification failed", {
      email: normalizedEmail,
      purpose,
      reason: result.reason,
      ipAddress,
    });

    if (result.reason === "not_found") {
      throw createHttpError(400, "Invalid or expired OTP");
    }

    if (result.reason === "max_attempts_exceeded") {
      throw createHttpError(429, "Too many failed attempts. Please request a new OTP.");
    }

    if (result.reason === "invalid_otp") {
      throw createHttpError(
        400,
        `Invalid OTP. ${result.attemptsRemaining} attempts remaining.`,
        { attemptsRemaining: result.attemptsRemaining }
      );
    }

    throw createHttpError(400, "Invalid OTP");
  }

  if (user && !isPasswordReset && !isLibraryRegister) {
    applyEmailVerifiedToUser(user);
    await user.save();
  }

  logger.info("Email OTP verified successfully", {
    email: normalizedEmail,
    purpose,
    ipAddress,
  });

  if (!isPasswordReset && !isLibraryRegister) {
    // Send verification success email
    try {
      await sendVerificationSuccessEmail({
        to: normalizedEmail,
        appName: "SmartLibDesk",
      });
    } catch (error) {
      // Non-critical error, don't fail the verification
      logger.warn("Failed to send verification success email", {
        email: normalizedEmail,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    message: "OTP verified successfully",
  };
}

async function sendForgotPasswordEmailOtp({ email, ipAddress, userAgent, appName = "SmartLibDesk" }) {
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }
  const normalizedEmail = email.trim().toLowerCase();

  let user = await Library.findOne({ email: normalizedEmail });
  let role = "library";
  if (!user) {
    user = await Student.findOne({ email: normalizedEmail });
    role = "student";
  }

  if (!user) {
    return {
      ok: true,
      message: FORGOT_PASSWORD_GENERIC_OK,
      blind: true,
      expiryMinutes: EMAIL_OTP_EXPIRY_MINUTES,
      resendAfterSeconds: EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
    };
  }

  const result = await sendEmailOtp({
    email: normalizedEmail,
    purpose: "password_reset",
    userId: user._id,
    ipAddress,
    userAgent,
    appName,
  });

  return {
    ok: true,
    message: FORGOT_PASSWORD_GENERIC_OK,
    expiryMinutes: result.expiryMinutes,
    resendAfterSeconds: result.resendAfterSeconds,
  };
}

async function verifyForgotPasswordEmailOtp({ email, otp, ipAddress, userAgent }) {
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }
  const otpStr = String(otp || "").trim();
  if (!/^\d{6}$/.test(otpStr)) {
    throw createHttpError(400, "OTP must be exactly 6 digits");
  }
  const normalizedEmail = email.trim().toLowerCase();

  const result = await EmailOtp.verifyEmailOtp({
    email: normalizedEmail,
    otp: otpStr,
    purpose: "password_reset",
    ipAddress,
    userAgent,
  });

  if (!result.success) {
    logger.warn("Forgot-password OTP verification failed", {
      email: normalizedEmail,
      reason: result.reason,
      ipAddress,
    });
    if (result.reason === "not_found") {
      throw createHttpError(400, "Invalid or expired code");
    }
    if (result.reason === "max_attempts_exceeded") {
      throw createHttpError(429, "Too many failed attempts. Request a new code.");
    }
    if (result.reason === "invalid_otp") {
      throw createHttpError(400, `Invalid code. ${result.attemptsRemaining} attempts remaining.`, {
        attemptsRemaining: result.attemptsRemaining,
      });
    }
    throw createHttpError(400, "Invalid code");
  }

  let user = await Library.findOne({ email: normalizedEmail });
  let role = "library";
  if (!user) {
    user = await Student.findOne({ email: normalizedEmail });
    role = "student";
  }
  if (!user) {
    logger.error("Forgot-password OTP verified but user missing", { email: normalizedEmail });
    throw createHttpError(400, "Invalid or expired code");
  }

  await PasswordResetSession.deleteMany({
    email: normalizedEmail,
    usedAt: null,
  });

  const session = await PasswordResetSession.createSession({
    email: normalizedEmail,
    userId: user._id,
    role,
    ttlMinutes: PASSWORD_RESET_SESSION_TTL_MINUTES,
  });

  logger.info("Forgot-password OTP verified; reset session issued", {
    email: normalizedEmail,
    role,
    ipAddress,
  });

  return {
    ok: true,
    resetSessionToken: session.rawToken,
    sessionExpiresMinutes: PASSWORD_RESET_SESSION_TTL_MINUTES,
  };
}

async function completeForgotPasswordReset({ email, resetSessionToken, newPassword, ipAddress, userAgent }) {
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const token = String(resetSessionToken || "").trim();
  const pw = String(newPassword || "").trim();

  if (!token || !pw) {
    throw createHttpError(400, "Session token and new password are required");
  }
  if (pw.length < 8) {
    throw createHttpError(400, "Password must be at least 8 characters long");
  }

  const consumed = await PasswordResetSession.consumeValidSession({
    email: normalizedEmail,
    rawToken: token,
  });

  if (!consumed.ok) {
    logger.warn("Forgot-password session invalid or reused", { email: normalizedEmail, ipAddress });
    throw createHttpError(
      401,
      "This reset session is invalid or has expired. Start again from Forgot password."
    );
  }

  const { session } = consumed;
  let user;
  if (session.role === "library") {
    user = await Library.findById(session.userId).select("+passwordHash");
  } else {
    user = await Student.findById(session.userId).select("+pinHash");
  }

  if (!user) {
    throw createHttpError(404, "User not found");
  }

  const passwordHash = await hashPassword(pw, 10);
  if (session.role === "library") {
    user.passwordHash = passwordHash;
  } else {
    user.pinHash = passwordHash;
  }
  await user.save();

  await PasswordResetSession.deleteMany({ email: normalizedEmail });

  logger.info("Password reset completed after email OTP", {
    email: normalizedEmail,
    role: session.role,
    userId: String(session.userId),
    ipAddress,
    userAgent: userAgent ? String(userAgent).slice(0, 120) : null,
  });

  return { ok: true, message: "Password updated. Please sign in with your new password." };
}

async function sendLibraryRegisterEmailOtp({ email, ipAddress, userAgent, appName = "SmartLibDesk" }) {
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await Library.findOne({ email: normalizedEmail });
  if (existing) {
    throw createHttpError(409, "Email already registered");
  }
  return sendEmailOtp({
    email: normalizedEmail,
    purpose: "library_register",
    ipAddress,
    userAgent,
    appName,
  });
}

async function verifyLibraryRegisterEmailOtp({ email, otp, ipAddress, userAgent }) {
  if (!validateEmail(email)) {
    throw createHttpError(400, "Invalid email address");
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await Library.findOne({ email: normalizedEmail });
  if (existing) {
    throw createHttpError(409, "Email already registered");
  }

  const otpStr = String(otp || "").trim();
  const len = EMAIL_OTP_LENGTH;
  if (!new RegExp(`^\\d{${len}}$`).test(otpStr)) {
    throw createHttpError(400, `OTP must be exactly ${len} digits`);
  }

  const result = await EmailOtp.verifyEmailOtp({
    email: normalizedEmail,
    otp: otpStr,
    purpose: "library_register",
    ipAddress,
    userAgent,
  });

  if (!result.success) {
    logger.warn("Library register OTP verification failed", {
      email: normalizedEmail,
      reason: result.reason,
      ipAddress,
    });
    if (result.reason === "not_found") {
      throw createHttpError(400, "Invalid or expired OTP");
    }
    if (result.reason === "max_attempts_exceeded") {
      throw createHttpError(429, "Too many failed attempts. Request a new code.");
    }
    if (result.reason === "invalid_otp") {
      throw createHttpError(400, `Invalid OTP. ${result.attemptsRemaining} attempts remaining.`, {
        attemptsRemaining: result.attemptsRemaining,
      });
    }
    throw createHttpError(400, "Invalid OTP");
  }

  await LibraryRegistrationSession.deleteMany({ email: normalizedEmail, usedAt: null });
  const session = await LibraryRegistrationSession.createSession({
    email: normalizedEmail,
    ttlMinutes: LIBRARY_REGISTRATION_SESSION_TTL_MINUTES,
  });

  logger.info("Library registration email verified; registration session issued", {
    email: normalizedEmail,
    ipAddress,
  });

  return {
    ok: true,
    registrationToken: session.rawToken,
    sessionExpiresMinutes: LIBRARY_REGISTRATION_SESSION_TTL_MINUTES,
  };
}

/**
 * Check if email is already verified
 */
function checkEmailVerified(user) {
  if (!user) return false;
  return Boolean(user.isEmailVerified);
}

/**
 * Resend OTP (alias for sendEmailOtp with same purpose)
 */
async function resendEmailOtp({ email, purpose, userId, ipAddress, userAgent, appName }) {
  return sendEmailOtp({
    email,
    purpose,
    userId,
    ipAddress,
    userAgent,
    appName,
  });
}

/**
 * Cleanup expired OTPs (can be called by a cron job)
 */
async function cleanupExpiredOtps() {
  const result = await EmailOtp.cleanupExpired();
  logger.info("Cleaned up expired email OTPs", { deletedCount: result.deletedCount });
  return result;
}

module.exports = {
  sendEmailOtp,
  verifyEmailOtp,
  resendEmailOtp,
  sendForgotPasswordEmailOtp,
  verifyForgotPasswordEmailOtp,
  completeForgotPasswordReset,
  sendLibraryRegisterEmailOtp,
  verifyLibraryRegisterEmailOtp,
  checkEmailVerified,
  cleanupExpiredOtps,
  validateEmail,
  EMAIL_OTP_LENGTH,
  EMAIL_OTP_EXPIRY_MINUTES,
  EMAIL_OTP_MAX_ATTEMPTS,
  EMAIL_OTP_RESEND_COOLDOWN_SECONDS,
  LIBRARY_REGISTRATION_SESSION_TTL_MINUTES,
};
