const express = require("express");
const router = express.Router();
const {
  sendEmailOtpHandler,
  verifyEmailOtpHandler,
  resendEmailOtpHandler,
  forgotPasswordSendOtpHandler,
  forgotPasswordVerifyOtpHandler,
  forgotPasswordResetPasswordHandler,
} = require("../controllers/emailOtp.controller");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for email OTP endpoints
 * Prevents abuse of OTP sending
 */
const emailOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many OTP requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for forgot-password send OTP
 */
const forgotPasswordSendOtpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many password reset code requests. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for forgot-password verify OTP (brute-force protection)
 */
const forgotPasswordVerifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: "Too many verification attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for final password reset
 */
const forgotPasswordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: "Too many password reset attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Public endpoints
router.post("/send-email-otp", emailOtpLimiter, sendEmailOtpHandler);
router.post("/verify-email-otp", verifyEmailOtpHandler);
router.post("/resend-email-otp", emailOtpLimiter, resendEmailOtpHandler);
router.post(
  "/forgot-password/send-otp",
  forgotPasswordSendOtpLimiter,
  forgotPasswordSendOtpHandler
);
router.post(
  "/forgot-password/verify-otp",
  forgotPasswordVerifyOtpLimiter,
  forgotPasswordVerifyOtpHandler
);
router.post(
  "/forgot-password/reset-password",
  forgotPasswordResetLimiter,
  forgotPasswordResetPasswordHandler
);

module.exports = router;
