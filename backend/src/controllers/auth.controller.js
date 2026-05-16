const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");
const { assertIndianMobileBody } = require("../utils/mobile");
const {
  getRefreshCookieResolvedName,
  isRefreshCookieEnabled,
  rotateRefreshCookie,
  setRefreshCookie,
} = require("../utils/refreshCookie");
const { sendSuccess } = require("../utils/response");

const AUTH_ROLES = new Set(["admin", "library", "student"]);

function sanitizeRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return AUTH_ROLES.has(role) ? role : undefined;
}

function getRequestMeta(req) {
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function sanitizeLoginBody(body = {}) {
  const role = sanitizeRole(body.role || body.loginType || body.accountType);
  const usernameOrMobile = String(body.usernameOrMobile || body.email || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const pin = String(body.pin || "").trim();
  const libraryCode = String(body.libraryCode || "").trim().toUpperCase();

  if (!usernameOrMobile && !email) {
    throw createHttpError(400, "usernameOrMobile/email and pin/password are required");
  }

  if (role === "library" && !password) {
    throw createHttpError(400, "password is required");
  }

  if (role === "student" && !pin) {
    throw createHttpError(400, "pin is required");
  }

  if (!pin && !password) {
    throw createHttpError(400, "usernameOrMobile/email and pin/password are required");
  }

  return {
    usernameOrMobile: usernameOrMobile || email,
    email,
    password,
    pin,
    ...(libraryCode ? { libraryCode } : {}),
    ...(role ? { role } : {}),
  };
}

function sanitizeRegisterLibraryBody(body = {}) {
  const libraryName = String(body.libraryName || "").trim();
  const ownerName = String(body.ownerName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "").trim();
  const city = String(body.city || "").trim();
  const state = String(body.state || "").trim();
  const place = String(body.place || "").trim();
  const pincode = String(body.pincode || "").replace(/\D/g, "").slice(0, 6);

  if (!libraryName || !ownerName || !email || !password || !city || !state || !place || !pincode) {
    throw createHttpError(400, "libraryName, ownerName, email, password, city, state, place, pincode are required");
  }
  if (!/^\d{6}$/.test(pincode)) {
    throw createHttpError(400, "pincode must be exactly 6 digits");
  }

  const phoneRaw = body.phone ?? body.mobile;
  let phone = null;
  if (phoneRaw != null && String(phoneRaw).trim() !== "") {
    phone = assertIndianMobileBody(phoneRaw, "phone");
  }

  const emailVerificationToken = String(body.emailVerificationToken || "").trim();
  if (!emailVerificationToken) {
    throw createHttpError(
      400,
      "emailVerificationToken is required. Verify your email with the code we sent you."
    );
  }

  return {
    libraryName,
    ownerName,
    email,
    password,
    city,
    state,
    place,
    pincode,
    phone,
    emailVerificationToken,
  };
}

function sanitizeRefreshBody(body = {}, req) {
  const fromBody = String(body.refreshToken ?? "").trim();
  const cookieEnabled = isRefreshCookieEnabled();
  const cookieName = getRefreshCookieResolvedName();
  const fromCookie =
    cookieEnabled && req
      ? String(
          req.signedCookies?.[cookieName] ?? req.cookies?.[cookieName] ?? ""
        ).trim()
      : "";
  const refreshToken = fromBody || fromCookie;
  if (!refreshToken) throw createHttpError(400, "refreshToken is required");
  return { refreshToken };
}

const login = asyncHandler(async (req, res) => {
  const result = await authService.login({
    body: sanitizeLoginBody(req.body),
    metadata: getRequestMeta(req),
  });
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, result, "Login successful");
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh({
    body: sanitizeRefreshBody(req.body, req),
    metadata: getRequestMeta(req),
  });
  rotateRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, result, "Token refreshed successfully");
});

const registerLibrary = asyncHandler(async (req, res) => {
  const result = await authService.registerLibrary({
    body: sanitizeRegisterLibraryBody(req.body),
    metadata: getRequestMeta(req),
  });
  setRefreshCookie(res, result.refreshToken);
  return sendSuccess(res, result, "Library registered successfully", 201);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changeAuthenticatedPassword({
    authUser: req.user,
    body: req.body,
    metadata: getRequestMeta(req),
  });
  return sendSuccess(res, { updated: true }, result.message || "Password updated successfully");
});

module.exports = {
  login,
  refresh,
  registerLibrary,
  changePassword,
};
