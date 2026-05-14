const Log = require("../models/Log");
const mongoose = require("mongoose");
const logger = require("./logger");
const { sanitizeAuditMetadata } = require("./auditMetadata");

const SEVERITY_ENUM = new Set([
  "debug",
  "info",
  "warn",
  "error",
  "security",
]);

/**
 * Best-effort log write (never throws to callers).
 * On persist failure: emits structured `logger.warn` so failures are not silent.
 */
async function writeLog(entry = {}) {
  let sanitizedMeta = null;
  try {
    const action = String(entry.action || "").trim().toLowerCase();
    if (!action) return;

    const coerceObjectIdOrNull = (v) => {
      if (v == null || v === "") return null;
      const s = String(v).trim();
      if (!mongoose.Types.ObjectId.isValid(s)) return null;
      return new mongoose.Types.ObjectId(s);
    };

    const doc = {
      action,
      // Keep schema-safe: admin uses "admin-1" which is not an ObjectId → store null
      userId: coerceObjectIdOrNull(entry.userId),
      role: entry.role ? String(entry.role).trim().toLowerCase() : null,
      libraryId: coerceObjectIdOrNull(entry.libraryId),
      timestamp: entry.timestamp || new Date(),
    };
    if (entry.ip != null) doc.ip = String(entry.ip).slice(0, 80);
    if (entry.userAgent != null) {
      doc.userAgent = String(entry.userAgent).slice(0, 500);
    }
    if (entry.metadata != null) {
      sanitizedMeta = sanitizeAuditMetadata(entry.metadata);
      doc.metadata = sanitizedMeta;
    }
    if (entry.metrics != null && typeof entry.metrics === "object") {
      const m = sanitizeAuditMetadata(entry.metrics);
      doc.metadata = doc.metadata
        ? { ...doc.metadata, _metrics: m }
        : { _metrics: m };
    }
    if (entry.severity != null) {
      const sev = String(entry.severity).trim().toLowerCase();
      if (SEVERITY_ENUM.has(sev)) doc.severity = sev;
    }
    // Important: `Model.create(doc, {})` can be interpreted as `create(doc, {})` (two docs),
    // causing validation errors on the empty second doc. Only pass options when needed.
    if (entry.session) {
      await Log.create([doc], { session: entry.session });
    } else {
      await Log.create(doc);
    }
  } catch (error) {
    let preview = null;
    try {
      preview =
        sanitizedMeta != null
          ? safeJsonPreview(sanitizedMeta, 900)
          : entry.metadata != null
            ? safeJsonPreview(
              sanitizeAuditMetadata(entry.metadata) || {},
              900
            )
            : null;
    } catch {
      preview = "[preview_unavailable]";
    }
    logger.warn("audit_log_persist_failed", {
      event: "audit_log_persist_failed",
      action: entry.action,
      userId: entry.userId ?? null,
      role: entry.role ?? null,
      libraryId: entry.libraryId ? String(entry.libraryId) : null,
      message: error?.message,
      code: error?.code,
      name: error?.name,
      metadataPreview: preview,
    });
  }
}

function safeJsonPreview(obj, maxBytes) {
  try {
    const s = JSON.stringify(obj);
    const buf = Buffer.byteLength(s, "utf8");
    if (buf <= maxBytes) return s;
    return `${s.slice(0, Math.floor(maxBytes / 2))}…`;
  } catch {
    return "[preview_unavailable]";
  }
}

module.exports = { writeLog };
