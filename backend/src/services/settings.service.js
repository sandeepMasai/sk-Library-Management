const GlobalSettings = require("../models/GlobalSettings");
const { createHttpError } = require("../utils/httpError");

function isValidHttpUrl(input) {
  try {
    const url = new URL(String(input || "").trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function toSettingsResponse(doc) {
  const legacyWhatsapp = String(doc?.defaultWhatsapp || "").trim();
  const legacyEmail = String(doc?.defaultEmail || "").trim();
  const legacyChannel = String(doc?.defaultCommunityLinks?.whatsappChannel || "").trim();

  return {
    privacyPolicyUrl: doc?.privacyPolicyUrl || "",
    termsUrl: doc?.termsUrl || "",
    refundPolicyUrl: doc?.refundPolicyUrl || "",
    communication: {
      whatsapp: doc?.communication?.whatsapp || legacyWhatsapp || "",
      channel: doc?.communication?.channel || legacyChannel || "",
      email: doc?.communication?.email || legacyEmail || "",
    },
    updatedAt: doc?.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

function toUpdatedSettingsResponse(doc) {
  return {
    privacyPolicyUrl: doc.privacyPolicyUrl,
    termsUrl: doc.termsUrl,
    refundPolicyUrl: doc.refundPolicyUrl || "",
    communication: {
      whatsapp: doc?.communication?.whatsapp || "",
      channel: doc?.communication?.channel || "",
      email: doc?.communication?.email || "",
    },
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  };
}

function normalizeCommunication(rawCommunication) {
  if (rawCommunication === undefined) return undefined;

  const w = rawCommunication?.whatsapp === undefined ? undefined : String(rawCommunication.whatsapp || "").trim();
  const c = rawCommunication?.channel === undefined ? undefined : String(rawCommunication.channel || "").trim();
  const e = rawCommunication?.email === undefined ? undefined : String(rawCommunication.email || "").trim();

  let whatsapp = undefined;
  if (w !== undefined) {
    const digits = w.replace(/\D/g, "");
    if (!digits) whatsapp = null;
    else if (!/^\d{10,15}$/.test(digits)) throw createHttpError(400, "Invalid communication.whatsapp (10–15 digits)");
    else whatsapp = digits;
  }

  let channel = undefined;
  if (c !== undefined) {
    if (!c) channel = null;
    else if (!isValidHttpUrl(c)) throw createHttpError(400, "Invalid communication.channel");
    else channel = c;
  }

  let email = undefined;
  if (e !== undefined) {
    const emailNorm = e.trim().toLowerCase();
    if (!emailNorm) email = null;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw createHttpError(400, "Invalid communication.email");
    else email = emailNorm;
  }

  return {
    ...(w !== undefined ? { whatsapp } : {}),
    ...(c !== undefined ? { channel } : {}),
    ...(e !== undefined ? { email } : {}),
  };
}

const EMPTY_SETTINGS = {
  privacyPolicyUrl: "",
  termsUrl: "",
  refundPolicyUrl: "",
  communication: { whatsapp: "", channel: "", email: "" },
  updatedAt: null,
};

async function getSettings() {
  const doc = await GlobalSettings.findById("global").lean();
  if (!doc) return { ...EMPTY_SETTINGS };
  return toUpdatedSettingsResponse(doc);
}

async function updateSettings({ body }) {
  const privacyPolicyUrl = String(body?.privacyPolicyUrl || "").trim();
  const termsUrl = String(body?.termsUrl || "").trim();
  const refundPolicyUrl =
    body?.refundPolicyUrl === undefined ? undefined : String(body.refundPolicyUrl || "").trim();
  const rawCommunication = body?.communication;

  if (!privacyPolicyUrl) throw createHttpError(400, "privacyPolicyUrl is required");
  if (!termsUrl) throw createHttpError(400, "termsUrl is required");
  if (!isValidHttpUrl(privacyPolicyUrl)) throw createHttpError(400, "Invalid privacyPolicyUrl");
  if (!isValidHttpUrl(termsUrl)) throw createHttpError(400, "Invalid termsUrl");
  if (refundPolicyUrl !== undefined && refundPolicyUrl && !isValidHttpUrl(refundPolicyUrl)) {
    throw createHttpError(400, "Invalid refundPolicyUrl");
  }

  const communication = normalizeCommunication(rawCommunication);
  let doc;
  try {
    doc = await GlobalSettings.findByIdAndUpdate(
      "global",
      {
        privacyPolicyUrl,
        termsUrl,
        ...(refundPolicyUrl !== undefined ? { refundPolicyUrl: refundPolicyUrl || "" } : {}),
        ...(rawCommunication !== undefined ? { communication } : {}),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    ).lean();
  } catch (err) {
    if (err?.name === "ValidationError") {
      const first = Object.values(err.errors || {})[0];
      throw createHttpError(400, first?.message || "Invalid settings");
    }
    throw err;
  }

  return toSettingsResponse(doc);
}

module.exports = {
  getSettings,
  updateSettings,
};
