"use strict";

const validator = require("validator");

const DEFAULT_STRING_MAX = 8192;

/**
 * Strip null bytes and trim; cap length for DoS-safe string handling.
 * @param {unknown} input
 * @param {number} maxLength
 */
function sanitizeString(input, maxLength = DEFAULT_STRING_MAX) {
  let s = String(input ?? "").replace(/\u0000/g, "");
  s = s.trim();
  if (maxLength > 0 && s.length > maxLength) {
    s = s.slice(0, maxLength);
  }
  return s;
}

/**
 * XSS-safe escaping for echoed text / logs (prefer for user-generated previews).
 */
function escapeHtml(text) {
  return validator.escape(String(text ?? ""));
}

/** @param {unknown} raw */
function normalizeEmail(raw) {
  const trimmed = sanitizeString(raw, 320);
  if (!trimmed) return "";
  try {
    return validator.normalizeEmail(trimmed, {
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      icloud_remove_subaddress: false,
      yahoo_remove_subaddress: false,
    }) ?? trimmed.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

/** @param {unknown} raw */
function isValidEmail(raw) {
  const s = String(raw ?? "").trim();
  return (
    s.length > 0 &&
    validator.isEmail(s, {
      allow_utf8_local_part: false,
      blacklisted_chars: "",
    })
  );
}

/** http/https only */
function isValidHttpUrl(raw) {
  const url = sanitizeString(raw, 2048);
  if (!url) return false;
  return validator.isURL(url, {
    protocols: ["http", "https"],
    require_protocol: true,
    require_valid_protocol: true,
    allow_underscores: true,
    allow_trailing_dot: false,
    allow_protocol_relative_urls: false,
    validate_length: false,
  });
}

/**
 * Normalize to last 10 Indian mobile digits after stripping non-digits and optional 91.
 * @param {unknown} raw
 */
function normalizeIndianMobileDigits(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  while (d.length > 10 && d.startsWith("91")) {
    d = d.slice(2);
  }
  return d.slice(0, 10);
}

/** @param {unknown} raw */
function isIndianMobileTenDigits(raw) {
  const ten = normalizeIndianMobileDigits(raw);
  return /^[6-9]\d{9}$/.test(ten);
}

module.exports = {
  DEFAULT_STRING_MAX,
  sanitizeString,
  escapeHtml,
  normalizeEmail,
  isValidEmail,
  isValidHttpUrl,
  normalizeIndianMobileDigits,
  isIndianMobileTenDigits,
};
