const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const { getSignedDocumentDownloadUrl } = require("../utils/cloudinary");

const LEGACY_PDF_LINE_RE = /📎\s*PDF:\s*(https?:\/\/\S+)/i;
const PDF_LABEL_RE = /PDF\s*:?\s*(https?:\/\/\S+)/i;
const PDF_URL_RE = /(https?:\/\/[^\s<>"']+\.pdf(?:\?[^\s<>"']*)?)/i;
const CLOUDINARY_RAW_RE = /(https?:\/\/res\.cloudinary\.com\/[^\s<>"']+\/raw\/upload\/[^\s<>"']+)/i;

function cleanUrl(raw) {
  return String(raw || "")
    .trim()
    .replace(/[),.;]+$/g, "");
}

function extractLegacyPdfUrl(message) {
  const text = String(message || "");

  const legacy = LEGACY_PDF_LINE_RE.exec(text);
  if (legacy?.[1]) return cleanUrl(legacy[1]);

  const labeled = PDF_LABEL_RE.exec(text);
  if (labeled?.[1]) return cleanUrl(labeled[1]);

  const pdfUrl = PDF_URL_RE.exec(text);
  if (pdfUrl?.[1]) return cleanUrl(pdfUrl[1]);

  const cloudinaryRaw = CLOUDINARY_RAW_RE.exec(text);
  if (cloudinaryRaw?.[1]) return cleanUrl(cloudinaryRaw[1]);

  const trimmed = text.trim();
  if (/^https?:\/\/\S+$/i.test(trimmed)) return cleanUrl(trimmed);

  return null;
}

function stripLegacyPdfLine(message) {
  let next = String(message || "");
  next = next.replace(LEGACY_PDF_LINE_RE, "");
  next = next.replace(PDF_LABEL_RE, "");
  next = next.replace(PDF_URL_RE, "");
  next = next.replace(CLOUDINARY_RAW_RE, "");
  if (/^https?:\/\/\S+$/i.test(next.trim())) return "";
  return next.replace(/\n{3,}/g, "\n\n").trim();
}

function getMaxReadReceipts() {
  const raw = Number.parseInt(
    process.env.NOTIFICATION_MAX_READ_RECEIPTS || "200",
    10
  );
  if (!Number.isFinite(raw) || raw <= 0) return 200;
  return Math.min(raw, 2000);
}

/**
 * Role-scoped visibility for a notification row within a library (tenant).
 */
function buildVisibilityFilter(userId, role) {
  const uid = String(userId || "").trim();
  const oid = mongoose.Types.ObjectId.isValid(uid)
    ? new mongoose.Types.ObjectId(uid)
    : null;

  if (role === "student" && oid) {
    return {
      $or: [
        { targetType: "all" },
        { targetType: "student", targetId: oid },
        { targetType: "student", targetId: uid },
      ],
    };
  }
  if (role === "library") {
    return {
      $or: [{ targetType: "all" }, { targetType: "library" }],
    };
  }
  if (role === "admin") {
    return {
      $or: [
        { targetType: "all" },
        { targetType: "library" },
        { targetType: "student" },
      ],
    };
  }
  return { _id: null };
}

function formatNotificationForClient(doc, viewerUserId) {
  const id = doc._id?.toString?.() || String(doc._id);
  const targetIdRaw = doc.targetId;
  const targetId =
    targetIdRaw == null || targetIdRaw === "all"
      ? "all"
      : typeof targetIdRaw === "object" && targetIdRaw.toString
        ? targetIdRaw.toString()
        : String(targetIdRaw);

  const readByMe = viewerUserId
    ? Notification.hasReadReceipt(doc, viewerUserId)
    : false;

  let documentUrl = doc.documentUrl ? String(doc.documentUrl).trim() || null : null;
  let message = doc.message;
  if (!documentUrl) {
    const legacyPdf = extractLegacyPdfUrl(message) || extractLegacyPdfUrl(doc.title);
    if (legacyPdf) {
      documentUrl = legacyPdf;
      message = stripLegacyPdfLine(message);
    }
  }
  if (documentUrl) {
    documentUrl = getSignedDocumentDownloadUrl(documentUrl);
  }

  return {
    id,
    libraryId: doc.libraryId?.toString?.() || null,
    title: doc.title,
    message,
    imageUrl: doc.imageUrl || null,
    documentUrl,
    messageType: doc.messageType || "text",
    date:
      doc.date instanceof Date
        ? doc.date.toISOString()
        : new Date(doc.date).toISOString(),
    targetId,
    targetType: doc.targetType || "all",
    category: doc.category || "general",
    readByMe,
    isRead: Boolean(doc.isRead),
    readAt: doc.readAt ? new Date(doc.readAt).toISOString() : null,
  };
}

/**
 * Idempotent per-user read receipt + optional legacy global flags for library inbox rows.
 * Duplicate prevention: $not + $elemMatch on userId, then $push with $slice cap (not $addToSet,
 * because receipt objects include readAt and would never dedupe).
 */
async function markNotificationRead({
  notificationId,
  libraryId,
  userId,
  role,
}) {
  const nid = String(notificationId || "").trim();
  const lid = String(libraryId || "").trim();
  const uid = String(userId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(nid) || !mongoose.Types.ObjectId.isValid(lid)) {
    const err = new Error("Invalid id");
    err.statusCode = 400;
    throw err;
  }
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    const err = new Error("Invalid user");
    err.statusCode = 400;
    throw err;
  }

  const userOid = new mongoose.Types.ObjectId(uid);
  const visibility = buildVisibilityFilter(uid, role);
  const maxR = getMaxReadReceipts();

  const doc = await Notification.findOne({
    _id: new mongoose.Types.ObjectId(nid),
    libraryId: new mongoose.Types.ObjectId(lid),
    $and: [visibility],
  }).lean();

  if (!doc) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }

  if (Notification.hasReadReceipt(doc, uid)) {
    return { ok: true, alreadyRead: true, readByMe: true };
  }

  const receipt = {
    userId: userOid,
    role: ["admin", "library", "student"].includes(String(role))
      ? String(role)
      : null,
    readAt: new Date(),
  };

  const res = await Notification.updateOne(
    {
      _id: new mongoose.Types.ObjectId(nid),
      libraryId: new mongoose.Types.ObjectId(lid),
      readReceipts: {
        $not: { $elemMatch: { userId: userOid } },
      },
    },
    {
      $push: {
        readReceipts: {
          $each: [receipt],
          $slice: -maxR,
        },
      },
    }
  );

  if (res.modifiedCount === 0) {
    return { ok: true, alreadyRead: true, readByMe: true };
  }

  if (role === "library" && doc.targetType === "library") {
    await Notification.updateOne(
      {
        _id: new mongoose.Types.ObjectId(nid),
        libraryId: new mongoose.Types.ObjectId(lid),
      },
      { $set: { isRead: true, readAt: new Date() } }
    );
  }

  return {
    ok: true,
    alreadyRead: false,
    readByMe: true,
  };
}

module.exports = {
  formatNotificationForClient,
  getMaxReadReceipts,
  markNotificationRead,
  buildVisibilityFilter,
};
