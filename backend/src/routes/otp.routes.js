/**
 * Public OTP endpoints (MSG91). Rate-limited at router level + service-level per mobile.
 */

"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const otpController = require("../controllers/otp.controller");

const router = express.Router();

const otpIpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({
      success: false,
      data: null,
      message: "Too many OTP requests from this network. Try again later.",
    }),
});

router.post("/send-otp", otpIpLimiter, otpController.sendOtp);
router.post("/verify-otp", otpIpLimiter, otpController.verifyOtp);

module.exports = router;
