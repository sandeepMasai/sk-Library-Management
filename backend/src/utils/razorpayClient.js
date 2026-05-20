"use strict";

const Razorpay = require("razorpay");
const logger = require("./logger");

function maskKeyId(keyId) {
  const k = String(keyId || "");
  if (k.length < 12) return "***";
  return `${k.slice(0, 12)}…${k.slice(-4)}`;
}

function detectKeyMode(keyId) {
  const k = String(keyId || "");
  if (k.startsWith("rzp_test_")) return "test";
  if (k.startsWith("rzp_live_")) return "live";
  return "unknown";
}

/**
 * Load Razorpay credentials from env. SECRET must never be sent to clients.
 * @returns {{ keyId: string, keySecret: string, mode: 'test'|'live'|'unknown', client: import('razorpay') }}
 */
function getRazorpayClient() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    const err = new Error("Razorpay keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET)");
    err.statusCode = 500;
    err.code = "RAZORPAY_NOT_CONFIGURED";
    throw err;
  }

  const mode = detectKeyMode(keyId);
  if (mode === "unknown") {
    logger.warn("Razorpay key_id has unexpected format", { keyId: maskKeyId(keyId) });
  }

  return {
    keyId,
    keySecret,
    mode,
    client: new Razorpay({ key_id: keyId, key_secret: keySecret }),
  };
}

/**
 * @param {unknown} error
 */
function parseRazorpayError(error) {
  const rpDesc = error?.error?.description || error?.description || null;
  const rpCode = error?.error?.code || error?.code || null;
  const message = String(rpDesc || error?.message || "Razorpay request failed");
  const authFailed =
    rpCode === "BAD_REQUEST_ERROR" && /authentication failed/i.test(message);
  return { rpDesc, rpCode, message, authFailed };
}

/**
 * @param {unknown} error
 * @param {{ action: string, libraryId?: string, planId?: string }} ctx
 */
function logRazorpayError(error, ctx = {}) {
  const { rpCode, message, authFailed } = parseRazorpayError(error);
  logger.error("Razorpay API error", {
    ...ctx,
    rpCode,
    message,
    authFailed,
    statusCode: error?.statusCode,
    keyId: maskKeyId(process.env.RAZORPAY_KEY_ID),
    mode: detectKeyMode(process.env.RAZORPAY_KEY_ID),
  });
}

module.exports = {
  detectKeyMode,
  getRazorpayClient,
  logRazorpayError,
  maskKeyId,
  parseRazorpayError,
};
