"use strict";

const { REFRESH_TOKEN_TTL_MS } = require("./token");

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

function getRefreshCookieRawName() {
  return String(process.env.AUTH_REFRESH_COOKIE_NAME || "refreshToken")
    .trim()
    .slice(0, 128)
    .replace(/^["']+|["']+$/g, "");
}

/** Display name stored in Cookie header (leading `refreshToken`). */
function getRefreshCookieResolvedName(name) {
  return name || getRefreshCookieRawName() || "refreshToken";
}

function isRefreshCookieEnabled() {
  const v = String(process.env.AUTH_REFRESH_COOKIE_ENABLED || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1";
}

function normalizeSameSite() {
  const s = String(process.env.AUTH_REFRESH_COOKIE_SAMESITE || "lax")
    .trim()
    .toLowerCase();
  if (s === "strict" || s === "none" || s === "lax") return s;
  return "lax";
}

function getRefreshCookiePath() {
  const p = String(process.env.AUTH_REFRESH_COOKIE_PATH || "/api").trim() || "/api";
  return p.startsWith("/") ? p : `/${p}`;
}

/** When COOKIE_SECRET is set, middleware signs cookies — match that here so clients get a valid signed cookie name. */
function shouldSignRefreshCookie() {
  return Boolean(String(process.env.COOKIE_SECRET || "").trim());
}

/**
 * @param {import('express').Response} res
 * @param {string} refreshToken
 */
function setRefreshCookie(res, refreshToken) {
  if (!isRefreshCookieEnabled()) return;
  const token = String(refreshToken || "").trim();
  if (!token) return;

  const name = getRefreshCookieResolvedName(getRefreshCookieRawName());

  /** @type {import('express').CookieOptions} */
  const opts = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: normalizeSameSite(),
    path: getRefreshCookiePath(),
    maxAge: REFRESH_TOKEN_TTL_MS,
    signed: shouldSignRefreshCookie(),
  };

  const domain = String(process.env.AUTH_REFRESH_COOKIE_DOMAIN || "").trim();
  if (domain) opts.domain = domain;

  res.cookie(name, token, opts);
}

/**
 * Rotate refresh cookie after /refresh (same flags as issue).
 * @param {import('express').Response} res
 * @param {string | null | undefined} newRefreshToken
 */
function rotateRefreshCookie(res, newRefreshToken) {
  if (!isRefreshCookieEnabled()) return;
  const token = String(newRefreshToken || "").trim();
  if (!token) return;
  setRefreshCookie(res, token);
}

/**
 * Clear cookie by best-effort (e.g. future logout endpoints).
 * @param {import('express').Response} res
 */
function clearRefreshCookie(res) {
  if (!isRefreshCookieEnabled()) return;
  const name = getRefreshCookieResolvedName(getRefreshCookieRawName());

  /** @type {import('express').CookieOptions} */
  const opts = {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: normalizeSameSite(),
    path: getRefreshCookiePath(),
  };

  const domain = String(process.env.AUTH_REFRESH_COOKIE_DOMAIN || "").trim();
  if (domain) opts.domain = domain;

  res.clearCookie(name, opts);
}

module.exports = {
  clearRefreshCookie,
  getRefreshCookieResolvedName,
  getRefreshCookiePath,
  isRefreshCookieEnabled,
  rotateRefreshCookie,
  setRefreshCookie,
};
