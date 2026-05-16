"use strict";

const mongoose = require("mongoose");
const { createHttpError } = require("../utils/httpError");
const {
  sanitizeString,
  isValidEmail,
  isValidHttpUrl,
  isIndianMobileTenDigits,
  normalizeIndianMobileDigits,
  DEFAULT_STRING_MAX,
} = require("../utils/inputValidation");

/**
 * Sanitize listed string paths on req.body before handlers run.
 * @param {string[]} paths
 * @param {{ maxLength?: number }} [opts]
 */
function sanitizeBody(paths, opts = {}) {
  const max = opts.maxLength ?? DEFAULT_STRING_MAX;
  const list = Array.isArray(paths) ? paths : [];

  return (req, _res, next) => {
    if (!req.body || typeof req.body !== "object") return next();
    for (const p of list) {
      if (!p) continue;
      const v = req.body[p];
      if (typeof v === "string") {
        req.body[p] = sanitizeString(v, max);
      }
    }
    next();
  };
}

/**
 * Assert body.email is optional or valid email format.
 */
function validateOptionalEmail(bodyKey = "email") {
  return (req, _res, next) => {
    const v = req.body?.[bodyKey];
    if (v == null || v === "") return next();
    if (!isValidEmail(String(v))) {
      return next(createHttpError(400, `Invalid ${bodyKey}`, { code: "INVALID_EMAIL" }));
    }
    next();
  };
}

/** Assert optional URL field uses http/https. */
function validateOptionalHttpUrl(bodyKey = "url") {
  return (req, _res, next) => {
    const v = req.body?.[bodyKey];
    if (v == null || v === "") return next();
    if (!isValidHttpUrl(String(v))) {
      return next(createHttpError(400, `Invalid ${bodyKey}`, { code: "INVALID_URL" }));
    }
    next();
  };
}

/** Required non-empty string fields validated as http(s) URLs (after prior sanitizers). */
function validateRequiredHttpUrlFields(fields) {
  const list = Array.isArray(fields) ? fields : [];

  return (req, _res, next) => {
    if (!req.body || typeof req.body !== "object") {
      return next(createHttpError(400, "Request body required", { code: "BAD_BODY" }));
    }
    for (const bodyKey of list) {
      if (!bodyKey) continue;
      const v = req.body[bodyKey];
      if (v == null || String(v).trim() === "") {
        return next(createHttpError(400, `${bodyKey} is required`, { code: "REQUIRED_FIELD" }));
      }
      if (!isValidHttpUrl(String(v))) {
        return next(createHttpError(400, `Invalid ${bodyKey}`, { code: "INVALID_URL" }));
      }
    }
    next();
  };
}

/** Optional Indian-style 10-digit mobile on one or more body keys. */
function validateOptionalIndianMobile(...keys) {
  const k = keys.length ? keys : ["mobile", "phone"];
  return (req, _res, next) => {
    for (const key of k) {
      const raw = req.body?.[key];
      if (raw == null || raw === "") continue;
      if (!isIndianMobileTenDigits(raw)) {
        return next(
          createHttpError(400, `Invalid ${key}`, { code: "INVALID_MOBILE" })
        );
      }
      req.body[key] = normalizeIndianMobileDigits(raw);
    }
    next();
  };
}

function validateObjectId(field, source = "body") {
  return (req, _res, next) => {
    const obj = req[source];
    const id = String(obj?.[field] ?? "").trim();
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(createHttpError(400, `Invalid ${field}`, { code: "INVALID_OBJECT_ID" }));
    }
    next();
  };
}

module.exports = {
  sanitizeBody,
  validateOptionalEmail,
  validateOptionalHttpUrl,
  validateRequiredHttpUrlFields,
  validateOptionalIndianMobile,
  validateObjectId,
};
