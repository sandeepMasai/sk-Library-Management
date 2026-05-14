const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const otpController = require("../controllers/otp.controller");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      data: null,
      message: "Too many login attempts. Try again later.",
    }),
});

const otpAuthLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      data: null,
      message: "Too many requests. Try again later.",
    }),
});

router.post("/login", loginLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/register-library", authController.registerLibrary);

router.post("/forgot-password/send-otp", otpAuthLimiter, otpController.forgotPasswordSendOtp);
router.post("/forgot-password/verify-otp", otpAuthLimiter, otpController.forgotPasswordVerifyOtp);
router.post("/reset-password", otpAuthLimiter, otpController.resetPasswordWithToken);

module.exports = router;
