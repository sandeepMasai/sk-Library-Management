const crypto = require("crypto");
const RefreshToken = require("../models/RefreshToken");
const { logAction } = require("../utils/audit");
const { writeLog } = require("../utils/logging");
const { createHttpError } = require("../utils/httpError");
const { hashToken, signAccessToken, signRefreshToken } = require("../utils/token");

function adminIdentity() {
  return {
    id: "admin-1",
    role: "admin",
    name: "Admin",
    username: String(process.env.ADMIN_USERNAME || "admin").trim(),
    mobile: String(process.env.ADMIN_MOBILE || "").trim(),
    pin: String(process.env.ADMIN_PIN || "admin@123").trim(),
  };
}

function normalizeAdminUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAdminMobile(value) {
  return String(value || "").replace(/\D/g, "");
}

function verifyAdminPin(inputPin, expectedPin) {
  const a = Buffer.from(String(inputPin || "").trim(), "utf8");
  const b = Buffer.from(String(expectedPin || "").trim(), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function verifyAdminCredentials(usernameInput, pinInput) {
  const admin = adminIdentity();
  const username = normalizeAdminUsername(usernameInput);
  const mobile = normalizeAdminMobile(usernameInput);
  const expectedUser = normalizeAdminUsername(admin.username);
  const expectedMobile = normalizeAdminMobile(admin.mobile);

  const usernameOk =
    username === expectedUser || (expectedMobile.length >= 7 && mobile === expectedMobile);

  return usernameOk && verifyAdminPin(pinInput, admin.pin);
}

async function issueAdminTokens(admin, metadata = {}) {
  const payload = { userId: admin.id, role: "admin", libraryId: null };
  const accessToken = signAccessToken(payload);
  const refresh = signRefreshToken(payload);
  const refreshTokenHash = hashToken(refresh.token);

  await RefreshToken.create({
    tokenHash: refreshTokenHash,
    tokenId: refresh.tokenId,
    familyId: crypto.randomUUID(),
    userId: String(admin.id),
    identityUserId: null,
    role: "admin",
    libraryId: null,
    expiresAt: refresh.expiresAt,
    ip: metadata.ip || null,
    userAgent: metadata.userAgent || null,
  });

  return {
    accessToken,
    refreshToken: refresh.token,
    authToken: accessToken,
  };
}

async function loginAdmin({ body, metadata }) {
  const username = String(body?.username || "").trim();
  const pin = String(body?.pin || "").trim();
  if (!username || !pin) {
    throw createHttpError(400, "username and pin are required");
  }

  if (!verifyAdminCredentials(username, pin)) {
    const admin = adminIdentity();
    writeLog({ action: "admin_login_failed", userId: "admin-1", role: "admin", libraryId: null });
    await logAction({
      action: "admin_login_failed",
      userId: "admin-1",
      role: "admin",
      libraryId: null,
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
      metadata: { username },
    });
    throw createHttpError(401, "Invalid admin credentials");
  }

  const admin = adminIdentity();
  const user = {
    id: admin.id,
    role: "admin",
    name: admin.name,
    username: admin.username,
    mobile: admin.mobile || "0000000000",
    joinDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
    feeStatus: "Paid",
    feeAmount: 0,
    isBlocked: false,
  };
  const tokens = await issueAdminTokens(admin, metadata);
  writeLog({ action: "admin_login", userId: admin.id, role: "admin", libraryId: null });
  await logAction({ action: "admin_login", userId: admin.id, role: "admin", libraryId: null, ip: metadata?.ip, userAgent: metadata?.userAgent });
  return { user, ...tokens };
}

module.exports = {
  loginAdmin,
};

