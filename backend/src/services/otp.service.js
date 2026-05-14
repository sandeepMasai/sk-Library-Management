/**
 * MSG91 OTP integration + local rate limits / brute-force counters.
 *
 * Indian mobile normalization and MSG91 `mobile` formatting live in {@link ../utils/mobile}.
 *
 * Env:
 * - MSG91_API_KEY (sent as `authkey` header)
 * - MSG91_TEMPLATE_ID — OTP template id from MSG91 panel (maps to API field `template_id`)
 * - MSG91_SENDER_ID — **Strongly recommended (India DLT):** approved sender (e.g. LIBAPP). Sent as `sender` on send.
 * - MSG91_OTP_EXPIRY_MINUTES (default 5) — should match template wording / panel
 * - MSG91_OTP_LENGTH (default 6)
 * - MSG91_OTP_SEND_URL / MSG91_OTP_VERIFY_URL — optional overrides (defaults control.msg91.com v5)
 * - MSG91_DEBUG=true — log full MSG91 JSON responses (no authkey; avoid enabling in untrusted log sinks)
 * - MSG91_MOCK=true — skips MSG91 HTTP; MSG91_MOCK_OTP for verify
 *
 * Delivery note: HTTP 200 + `request_id` means MSG91 accepted the job. SMS can still show "Pending"
 * in the dashboard until the operator delivers (DLT / sender–template mapping / template approval).
 */

"use strict";

const axios = require("axios");
const logger = require("../utils/logger");
const OtpSendLog = require("../models/OtpSendLog");
const { createHttpError } = require("../utils/httpError");
const { normalizeIndianMobile, formatMsg91Mobile } = require("../utils/mobile");

const MSG91_OTP_URL_DEFAULT = "https://control.msg91.com/api/v5/otp";
const MSG91_VERIFY_URL_DEFAULT = "https://control.msg91.com/api/v5/otp/verify";

const OTP_SEND_WINDOW_MS = 10 * 60 * 1000;
const MAX_OTP_SENDS_PER_WINDOW = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

const MAX_VERIFY_FAILS = Number.parseInt(process.env.OTP_MAX_VERIFY_FAILS || "8", 10) || 8;
const VERIFY_BLOCK_MS =
  Number.parseInt(process.env.OTP_VERIFY_BLOCK_MINUTES || "30", 10) * 60 * 1000 || 30 * 60 * 1000;

const MSG91_SEND_MAX_ATTEMPTS = Number.parseInt(process.env.MSG91_SEND_MAX_ATTEMPTS || "2", 10) || 2;
const MSG91_SEND_RETRY_DELAY_MS = Number.parseInt(process.env.MSG91_SEND_RETRY_DELAY_MS || "500", 10) || 500;

function isMsg91MockEnabled() {
  const v = String(process.env.MSG91_MOCK || "").trim().toLowerCase();
  return v === "true" || v === "1";
}

function isMsg91DebugEnabled() {
  const v = String(process.env.MSG91_DEBUG || "").trim().toLowerCase();
  return v === "true" || v === "1";
}

function msg91OtpSendUrl() {
  return String(process.env.MSG91_OTP_SEND_URL || MSG91_OTP_URL_DEFAULT).trim() || MSG91_OTP_URL_DEFAULT;
}

function msg91OtpVerifyUrl() {
  return String(process.env.MSG91_OTP_VERIFY_URL || MSG91_VERIFY_URL_DEFAULT).trim() || MSG91_VERIFY_URL_DEFAULT;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function maskMsg91Mobile(mobileDigits) {
  const s = String(mobileDigits || "").replace(/\D/g, "");
  if (s.length < 4) return "(invalid)";
  return `${s.slice(0, 2)}******${s.slice(-4)}`;
}

function validateTemplateId(templateId) {
  const tid = String(templateId || "").trim();
  if (!tid) {
    throw createHttpError(503, "MSG91_TEMPLATE_ID is empty.", { code: "MSG91_BAD_TEMPLATE" });
  }
  if (tid.length < 8 || tid.length > 64) {
    logger.warn("MSG91 template_id length unusual; verify panel copy-paste", { length: tid.length });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(tid)) {
    logger.warn("MSG91 template_id has unexpected characters; check for hidden spaces or quotes");
  }
  return tid;
}

function assertMsg91Configured() {
  if (isMsg91MockEnabled()) return;
  const key = String(process.env.MSG91_API_KEY || "").trim();
  const tid = String(process.env.MSG91_TEMPLATE_ID || "").trim();
  if (!key || !tid) {
    throw createHttpError(
      503,
      "OTP provider is not configured. Set MSG91_API_KEY + MSG91_TEMPLATE_ID, or MSG91_MOCK=true for development.",
      { code: "MSG91_NOT_CONFIGURED" }
    );
  }
  const sender = String(process.env.MSG91_SENDER_ID || "").trim();
  if (!sender) {
    logger.warn(
      "MSG91_SENDER_ID is not set. For India DLT, OTP SMS is often rejected or stuck Pending unless the approved sender (e.g. LIBAPP) is sent with the request."
    );
  }
}

function msg91Headers() {
  return {
    authkey: String(process.env.MSG91_API_KEY || "").trim(),
    "Content-Type": "application/json",
  };
}

function isRetryableSendFailure(err) {
  if (!err || err.isAxiosError !== true) return false;
  if (!err.response) return true;
  const s = err.response.status;
  return s === 408 || s === 429 || (s >= 500 && s <= 599);
}

/**
 * Interpret MSG91 send-OTP JSON. Many accounts return HTTP 200 with `type: success` and `request_id`;
 * some return 200 with `type: error` when template/sender/DLT validation fails (still no SMS).
 */
function interpretMsg91SendResponse(res) {
  const data = res.data && typeof res.data === "object" ? res.data : {};
  const type = String(data.type || data.status || "").toLowerCase();
  const message = String(data.message || data.msg || data.description || "").trim();
  const requestId = String(data.request_id || data.reqId || data.requestId || data.requestID || "").trim();
  const flowId = data.flow_id ?? data.flowId ?? data.flowID;
  const errors = Array.isArray(data.errors) ? data.errors : [];

  const looksAccepted =
    type === "success" ||
    Boolean(requestId) ||
    /success|submitted|queued|accepted/i.test(message);

  const looksRejected =
    type === "error" ||
    /invalid|fail|reject|unauthor|not\s*approved|template|dlt|sender|blocked|balance|credit/i.test(message) ||
    errors.length > 0;

  return {
    httpStatus: res.status,
    type,
    message,
    requestId,
    flowId,
    errors,
    looksAccepted,
    looksRejected,
    raw: data,
  };
}

function throwFromMsg91Send(parsed, httpStatus) {
  const hint =
    "Check MSG91 dashboard: template approved, DLT entity + sender (LIBAPP) mapped to this template, and wallet/route. Enable MSG91_DEBUG=true for full JSON.";
  if (httpStatus === 429) {
    const err = createHttpError(429, parsed.message || "MSG91 rate limit. Please wait before retrying.");
    err.data = {
      code: "MSG91_RATE_LIMIT",
      retryAfterSeconds: Number(parsed.raw?.retry_after || parsed.raw?.retryAfter) || 60,
    };
    throw err;
  }
  if (parsed.errors.length) {
    const first = parsed.errors[0];
    const msg = typeof first === "string" ? first : first?.message || "MSG91 validation error";
    throw createHttpError(502, `${msg}. ${hint}`, {
      code: "MSG91_ERRORS",
      details: parsed.errors,
    });
  }
  if (parsed.looksRejected || !parsed.looksAccepted) {
    throw createHttpError(
      502,
      parsed.message || "MSG91 did not accept this OTP send request.",
      { code: "MSG91_SEND_REJECTED", msg91Type: parsed.type || null, flowId: parsed.flowId ?? null }
    );
  }
}

async function countSendsInWindow(mobileKey) {
  const since = new Date(Date.now() - OTP_SEND_WINDOW_MS);
  return OtpSendLog.countDocuments({ mobileKey, createdAt: { $gte: since } });
}

async function lastSendAt(mobileKey) {
  const row = await OtpSendLog.findOne({ mobileKey }).sort({ createdAt: -1 }).select("createdAt").lean();
  return row?.createdAt ? new Date(row.createdAt) : null;
}

/**
 * Per-mobileKey: max 5 sends / 10 minutes + min 60s between sends (resend UX).
 */
async function enforceSendPolicies({ mobileKey, ip }) {
  const n = await countSendsInWindow(mobileKey);
  if (n >= MAX_OTP_SENDS_PER_WINDOW) {
    const err = createHttpError(429, "Too many OTP requests for this number. Try again in about 10 minutes.");
    err.data = { code: "OTP_RATE_LIMIT", retryAfterSeconds: Math.ceil(OTP_SEND_WINDOW_MS / 1000) };
    throw err;
  }
  const last = await lastSendAt(mobileKey);
  if (last && Date.now() - last.getTime() < RESEND_COOLDOWN_MS) {
    const next = new Date(last.getTime() + RESEND_COOLDOWN_MS);
    const err = createHttpError(429, "Please wait before requesting another OTP.");
    err.data = {
      code: "OTP_RESEND_COOLDOWN",
      nextAllowedAt: next.toISOString(),
      resendAfterSeconds: Math.ceil((next.getTime() - Date.now()) / 1000),
    };
    throw err;
  }
  void ip;
}

async function logSend({ mobileKey, purpose, ip, msg91 }) {
  await OtpSendLog.create({
    mobileKey,
    purpose: String(purpose || "unknown").slice(0, 64),
    ip: String(ip || "").slice(0, 128),
    msg91RequestId: msg91?.requestId ? String(msg91.requestId).slice(0, 128) : "",
    msg91ResponseType: msg91?.responseType ? String(msg91.responseType).slice(0, 64) : "",
    msg91ResponseMessage: msg91?.responseMessage ? String(msg91.responseMessage).slice(0, 512) : "",
  });
}

async function postMsg91WithRetry(url, body, options) {
  let lastErr;
  for (let attempt = 1; attempt <= MSG91_SEND_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await axios.post(url, body, {
        ...options,
        validateStatus: () => true,
      });
      if (res.status >= 500 && res.status <= 599 && attempt < MSG91_SEND_MAX_ATTEMPTS) {
        logger.warn("MSG91 send HTTP 5xx; retrying", { status: res.status, attempt });
        await sleep(MSG91_SEND_RETRY_DELAY_MS * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (isRetryableSendFailure(err) && attempt < MSG91_SEND_MAX_ATTEMPTS) {
        logger.warn("MSG91 send network error; retrying", { attempt, message: err.message });
        await sleep(MSG91_SEND_RETRY_DELAY_MS * attempt);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/**
 * Send OTP via MSG91.
 *
 * @param {string} mobile10 — normalized 10-digit Indian mobile (DB form)
 * @returns {Promise<{ mocked: boolean, requestId?: string, responseType?: string, responseMessage?: string, flowId?: unknown }>}
 */
async function dispatchMsg91Otp(mobile10) {
  const normalizedMobile = normalizeIndianMobile(mobile10);
  if (!normalizedMobile) {
    throw createHttpError(400, "Valid 10-digit Indian mobile number is required.", { code: "INVALID_INDIAN_MOBILE" });
  }
  const msg91Mobile = formatMsg91Mobile(normalizedMobile);

  if (isMsg91MockEnabled()) {
    logger.info("MSG91_MOCK: outbound OTP skipped", { mobileMasked: maskMsg91Mobile(msg91Mobile) });
    return { mocked: true };
  }

  const template_id = validateTemplateId(process.env.MSG91_TEMPLATE_ID);
  const otp_length = Number.parseInt(process.env.MSG91_OTP_LENGTH || "6", 10) || 6;
  const otp_expiry = Number.parseInt(process.env.MSG91_OTP_EXPIRY_MINUTES || "5", 10) || 5;
  const sender = String(process.env.MSG91_SENDER_ID || "").trim();

  const payload = {
    template_id,
    mobile: msg91Mobile,
    otp_length,
    otp_expiry,
  };
  if (sender) {
    payload.sender = sender;
  }

  const url = msg91OtpSendUrl();
  const safeLogPayload = {
    template_id,
    mobile: maskMsg91Mobile(msg91Mobile),
    otp_length,
    otp_expiry,
    hasSender: Boolean(sender),
    sender: sender || undefined,
  };

  logger.info("MSG91 OTP send request", { url, payload: safeLogPayload });

  const res = await postMsg91WithRetry(url, payload, { headers: msg91Headers(), timeout: 25_000 });

  if (isMsg91DebugEnabled()) {
    logger.info("MSG91 OTP send raw response", { httpStatus: res.status, body: res.data });
  } else {
    logger.info("MSG91 OTP send response summary", {
      httpStatus: res.status,
      type: res.data?.type,
      message: res.data?.message,
      request_id: res.data?.request_id || res.data?.reqId,
      flow_id: res.data?.flow_id ?? res.data?.flowId,
    });
  }

  const parsed = interpretMsg91SendResponse(res);

  if (parsed.httpStatus !== 200) {
    logger.warn("MSG91 send non-200", { httpStatus: parsed.httpStatus, message: parsed.message, type: parsed.type });
    throwFromMsg91Send(parsed, parsed.httpStatus);
  }

  throwFromMsg91Send(parsed, 200);

  if (!parsed.requestId && isMsg91DebugEnabled()) {
    logger.warn("MSG91 send: success path but no request_id in body — confirm API version / response shape", {
      type: parsed.type,
    });
  }

  logger.info("MSG91 OTP send accepted by API", {
    requestId: parsed.requestId || null,
    flowId: parsed.flowId ?? null,
    note: "Dashboard may show Pending until operator delivers; if it never delivers, fix DLT/sender/template in MSG91 panel.",
  });

  return {
    mocked: false,
    requestId: parsed.requestId || "",
    responseType: parsed.type || "",
    responseMessage: parsed.message || "",
    flowId: parsed.flowId,
  };
}

async function verifyMsg91Otp(mobile10, otp) {
  const normalizedMobile = normalizeIndianMobile(mobile10);
  if (!normalizedMobile) return false;
  let msg91Mobile;
  try {
    msg91Mobile = formatMsg91Mobile(normalizedMobile);
  } catch {
    return false;
  }

  const otpStr = String(otp || "").replace(/\D/g, "");
  const otpRecord = isMsg91MockEnabled()
    ? {
        otp: String(process.env.MSG91_MOCK_OTP || "123456").replace(/\D/g, ""),
        expiresAt: null,
      }
    : null;

  if (isMsg91DebugEnabled()) {
    logger.info("MSG91 OTP verify attempt", {
      mobile: maskMsg91Mobile(msg91Mobile),
      enteredLen: otpStr.length,
      storedMock: otpRecord?.otp ? "[set]" : null,
      expires: otpRecord?.expiresAt,
      now: new Date().toISOString(),
    });
  }

  if (!otpStr) return false;
  if (isMsg91MockEnabled()) {
    const fixed = String(process.env.MSG91_MOCK_OTP || "123456").replace(/\D/g, "");
    return fixed === otpStr;
  }

  const url = msg91OtpVerifyUrl();
  const body = { mobile: msg91Mobile, otp: otpStr };
  logger.info("MSG91 OTP verify request", { url, mobile: maskMsg91Mobile(msg91Mobile), otpLen: otpStr.length });

  const res = await axios.post(url, body, { headers: msg91Headers(), timeout: 25_000, validateStatus: () => true });
  const data = res.data || {};

  if (isMsg91DebugEnabled()) {
    logger.info("MSG91 OTP verify raw response", { httpStatus: res.status, body: data });
  } else {
    logger.info("MSG91 OTP verify response summary", {
      httpStatus: res.status,
      type: data.type,
      message: data.message,
    });
  }

  if (res.status === 429) {
    logger.warn("MSG91 verify rate limited", { message: data.message });
    return false;
  }
  if (res.status !== 200) {
    logger.warn("MSG91 verify HTTP error", { status: res.status, message: data.message });
    return false;
  }
  if (String(data.type || "").toLowerCase() === "success") return true;
  if (String(data.message || "").toLowerCase().includes("success")) return true;
  if (String(data.message || "").toLowerCase().includes("verified")) return true;
  return false;
}

function assertNotOtpBlocked(doc) {
  if (doc?.otpBlockedUntil && new Date(doc.otpBlockedUntil).getTime() > Date.now()) {
    const err = createHttpError(
      423,
      "Too many failed OTP attempts. This account is temporarily blocked from OTP. Try again later or use password login."
    );
    err.data = { code: "OTP_BLOCKED", blockedUntil: new Date(doc.otpBlockedUntil).toISOString() };
    throw err;
  }
}

async function recordVerifyFailure(model, id) {
  const updated = await model.findByIdAndUpdate(id, { $inc: { otpAttempts: 1 } }, { new: true }).select("otpAttempts");
  const attempts = updated?.otpAttempts ?? 0;
  if (attempts >= MAX_VERIFY_FAILS) {
    await model.findByIdAndUpdate(id, { otpBlockedUntil: new Date(Date.now() + VERIFY_BLOCK_MS) });
    logger.warn("OTP verify block applied", { model: model.modelName, id: String(id), attempts });
  }
}

async function resetOtpGateOnSuccess(model, id) {
  await model.findByIdAndUpdate(id, {
    otpAttempts: 0,
    otpBlockedUntil: null,
    isMobileVerified: true,
  });
}

module.exports = {
  assertMsg91Configured,
  /** @deprecated Prefer `require("../utils/mobile").normalizeIndianMobile` */
  normalizeIndiaMobile10: normalizeIndianMobile,
  enforceSendPolicies,
  logSend,
  dispatchMsg91Otp,
  verifyMsg91Otp,
  assertNotOtpBlocked,
  recordVerifyFailure,
  resetOtpGateOnSuccess,
  RESEND_COOLDOWN_MS,
  OTP_SEND_WINDOW_MS,
  MAX_OTP_SENDS_PER_WINDOW,
};
