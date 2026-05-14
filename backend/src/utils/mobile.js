/**
 * Indian mobile utilities for OTP (MSG91) and MongoDB persistence.
 *
 * Storage rule: persist exactly 10 digits (no +, no spaces, no leading 91).
 * MSG91 rule: send `mobile` as 12 digits with country code, e.g. 919529525004 (no +).
 */

"use strict";

const { createHttpError } = require("./httpError");

/** TRAI-style Indian mobile: first digit 6–9. */
const INDIAN_MOBILE_10 = /^[6-9]\d{9}$/;

function isBlank(raw) {
  if (raw == null) return true;
  return String(raw).trim() === "";
}

/**
 * True when the value starts with an explicit international prefix other than +91.
 * Used to return a clear error instead of mis-parsing the last 10 digits.
 */
function hasNonIndiaPlusPrefix(raw) {
  const t = String(raw || "").trim();
  if (!t.startsWith("+")) return false;
  return !/^\+91/i.test(t);
}

/**
 * Normalize user input to exactly 10 Indian mobile digits for DB and queries.
 *
 * Steps (conceptually):
 * - trim / collapse spaces
 * - strip a leading +91 (case-insensitive) before digit extraction
 * - keep digits only; strip repeated leading 91 while length > 10
 * - take the last 10 digits; validate Indian mobile pattern
 *
 * @param {unknown} raw
 * @returns {string | null} ten digits, or null if invalid / empty
 *
 * @example normalizeIndianMobile("+91 95295-25004") => "9529525004"
 */
function normalizeIndianMobile(raw) {
  if (isBlank(raw)) return null;

  const trimmedForCc = String(raw).trim();
  if (trimmedForCc.startsWith("+") && !/^\+91/i.test(trimmedForCc)) {
    return null;
  }

  let s = String(raw).replace(/\s+/g, "").trim();
  if (!s) return null;

  if (/^\+91/i.test(s)) {
    s = s.replace(/^\+91/i, "");
  }

  let digits = s.replace(/\D/g, "");
  if (!digits.length) return null;

  while (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  const ten = digits.slice(-10);
  if (!INDIAN_MOBILE_10.test(ten)) return null;
  return ten;
}

/**
 * MSG91 `mobile` field: India country code + 10-digit subscriber number (no +).
 *
 * @param {unknown} mobile — raw or normalized 10-digit string
 * @returns {string} e.g. "919529525004"
 */
function formatMsg91Mobile(mobile) {
  const normalized = normalizeIndianMobile(mobile);
  if (!normalized) {
    throw createHttpError(400, "Valid 10-digit Indian mobile number is required.", {
      code: "INVALID_INDIAN_MOBILE",
    });
  }
  return `91${normalized}`;
}

/**
 * Validates request mobile fields with production-oriented HTTP errors.
 *
 * @param {unknown} raw
 * @param {string} [fieldName="mobile"] — for error payload only
 * @returns {string} normalized 10-digit Indian mobile
 */
function assertIndianMobileBody(raw, fieldName = "mobile") {
  if (isBlank(raw)) {
    throw createHttpError(400, "Mobile number is required.", {
      code: "MISSING_MOBILE",
      field: fieldName,
    });
  }
  if (hasNonIndiaPlusPrefix(raw)) {
    throw createHttpError(400, "Only Indian (+91) mobile numbers are supported for OTP.", {
      code: "UNSUPPORTED_COUNTRY",
      field: fieldName,
    });
  }
  const ten = normalizeIndianMobile(raw);
  if (!ten) {
    throw createHttpError(400, "Valid 10-digit Indian mobile number is required.", {
      code: "INVALID_INDIAN_MOBILE",
      field: fieldName,
    });
  }
  return ten;
}

/**
 * Optional: normalize when empty is allowed (e.g. profile clearing phone).
 *
 * @param {unknown} raw
 * @returns {string | null}
 */
function normalizeIndianMobileOptional(raw) {
  if (isBlank(raw)) return null;
  return normalizeIndianMobile(raw);
}

module.exports = {
  normalizeIndianMobile,
  formatMsg91Mobile,
  assertIndianMobileBody,
  normalizeIndianMobileOptional,
  hasNonIndiaPlusPrefix,
};
