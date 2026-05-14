/**
 * Library owner: verify profile phone via MSG91 (used from app.js with absolute paths).
 */

"use strict";

const Library = require("../models/Library");
const otpService = require("../services/otp.service");
const { normalizeIndianMobile } = require("../utils/mobile");
const { toLibraryProfile } = require("../routes/library.serialize");

function getRequestMeta(req) {
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function otpExpiryMinutes() {
  return Number.parseInt(process.env.MSG91_OTP_EXPIRY_MINUTES || "5", 10) || 5;
}

async function sendLibraryProfileMobileOtp(req, res) {
  try {
    const id = req.user?.libraryId;
    const lib = await Library.findById(id);
    if (!lib) return res.status(404).json({ message: "Library not found" });
    if (lib.isMobileVerified) {
      return res.status(400).json({ message: "This mobile number is already verified." });
    }
    const mobile10 = normalizeIndianMobile(lib.phone);
    if (!mobile10) {
      return res.status(400).json({ message: "Add a valid 10-digit Indian mobile number to your profile first." });
    }
    otpService.assertMsg91Configured();
    otpService.assertNotOtpBlocked(lib);
    const mobileKey = `library_profile_verify:${String(id)}`;
    const meta = getRequestMeta(req);
    await otpService.enforceSendPolicies({ mobileKey, ip: meta.ip });
    await otpService.dispatchMsg91Otp(mobile10);
    await otpService.logSend({ mobileKey, purpose: "library_profile_verify", ip: meta.ip });
    return res.json({
      ok: true,
      message: "OTP sent successfully",
      resendAfterSeconds: Math.ceil(otpService.RESEND_COOLDOWN_MS / 1000),
      otpExpiresInMinutes: otpExpiryMinutes(),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message: error.message || "Request failed",
        ...(error.data && typeof error.data === "object" ? error.data : {}),
      });
    }
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
}

async function verifyLibraryProfileMobileOtp(req, res) {
  try {
    const otp = String(req.body?.otp || "").trim().replace(/\D/g, "");
    if (!/^\d{4,8}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid OTP format" });
    }
    const id = req.user?.libraryId;
    const lib = await Library.findById(id);
    if (!lib) return res.status(404).json({ message: "Library not found" });
    if (lib.isMobileVerified) {
      const fresh = await Library.findById(id).lean();
      return res.json({ ok: true, alreadyVerified: true, profile: toLibraryProfile(fresh), message: "Mobile already verified" });
    }
    const mobile10 = normalizeIndianMobile(lib.phone);
    if (!mobile10) {
      return res.status(400).json({ message: "Add a valid 10-digit Indian mobile number to your profile first." });
    }
    otpService.assertMsg91Configured();
    otpService.assertNotOtpBlocked(lib);
    const ok = await otpService.verifyMsg91Otp(mobile10, otp);
    if (!ok) {
      await otpService.recordVerifyFailure(Library, lib._id);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    await otpService.resetOtpGateOnSuccess(Library, lib._id);
    const updated = await Library.findById(id).lean();
    return res.json({ ok: true, profile: toLibraryProfile(updated), message: "Mobile verified" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message: error.message || "Request failed",
        ...(error.data && typeof error.data === "object" ? error.data : {}),
      });
    }
    return res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
}

module.exports = {
  sendLibraryProfileMobileOtp,
  verifyLibraryProfileMobileOtp,
};
