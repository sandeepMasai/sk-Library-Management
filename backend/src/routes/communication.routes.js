const express = require("express");
const mongoose = require("mongoose");
const uploadCommunication = require("../middleware/upload.communication.middleware");
const { isPdfFile } = uploadCommunication;
const { uploadBuffer, isCloudinaryConfigured } = require("../utils/cloudinary");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { requireNotExpiredSubscription } = require("../middleware/subscription.middleware");
const {
  sendCommunicationMessage,
  listCommunicationHistory,
  resolveRecipients,
  getCommunicationStats,
  updateCommunicationCampaign,
  deleteCommunicationCampaign,
} = require("../services/communication.service");
const asyncHandler = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");
const Shift = require("../models/Shift");

const router = express.Router();

function parseStudentIds(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * GET /api/communications/stats
 */
router.get(
  "/stats",
  requireAuth,
  requireRole("library", "admin"),
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.query.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }
    const stats = await getCommunicationStats(libraryId);
    res.json({ ok: true, stats });
  })
);

/**
 * GET /api/communications/history
 */
router.get(
  "/history",
  requireAuth,
  requireRole("library", "admin"),
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.query.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }
    const history = await listCommunicationHistory(libraryId, {
      limit: req.query.limit,
    });
    res.json({ ok: true, history });
  })
);

/**
 * GET /api/communications/preview-count?audience=all&shiftId=
 */
router.get(
  "/preview-count",
  requireAuth,
  requireRole("library", "admin"),
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.query.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }
    const audience = String(req.query.audience || "all").trim().toLowerCase();
    const studentIds = parseStudentIds(req.query.studentIds);
    const shiftId = req.query.shiftId || null;

    if (audience === "selected" && studentIds.length === 0) {
      return res.json({ ok: true, success: true, count: 0, message: "No students selected" });
    }
    if (audience === "shift" && !shiftId) {
      return res.json({ ok: true, success: true, count: 0, message: "No shift selected" });
    }

    const recipients = await resolveRecipients(libraryId, { audience, studentIds, shiftId });
    res.json({ ok: true, success: true, count: recipients.length });
  })
);

/**
 * POST /api/communications/send
 * multipart: image (optional), fields: title, message, messageType, audience, studentIds, shiftId, category
 */
router.post(
  "/send",
  requireAuth,
  requireRole("library", "admin"),
  requireNotExpiredSubscription,
  uploadCommunication.fields([
    { name: "image", maxCount: 1 },
    { name: "document", maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.body.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }

    const {
      title,
      message = "",
      messageType = "text",
      audience = "all",
      shiftId = null,
      category = "general",
    } = req.body || {};
    const studentIds = parseStudentIds(req.body?.studentIds);

    let imageUrl = String(req.body?.imageUrl || "").trim() || null;
    let documentUrl = String(req.body?.documentUrl || "").trim() || null;
    let bodyMessage = String(message || "").trim();
    let bodyMessageType = messageType;

    const uploadedFile =
      req.files?.document?.[0] || req.files?.image?.[0] || req.file || null;

    if (uploadedFile?.buffer) {
      if (!isCloudinaryConfigured()) {
        throw createHttpError(500, "File upload is not configured");
      }
      const isPdf = isPdfFile(uploadedFile);
      const { url } = await uploadBuffer(uploadedFile.buffer, {
        folder: "libdesk/communications",
        ...(isPdf
          ? { resource_type: "raw", format: "pdf", type: "upload", access_mode: "public" }
          : { transformation: [{ width: 1200, crop: "limit" }] }),
      });
      if (isPdf) {
        documentUrl = url;
        const pdfLine = `📎 PDF: ${url}`;
        if (!bodyMessage.includes(url)) {
          bodyMessage = bodyMessage ? `${bodyMessage}\n\n${pdfLine}` : pdfLine;
        }
        bodyMessageType = bodyMessage === pdfLine ? "pdf" : "text_pdf";
      } else {
        imageUrl = url;
        if (bodyMessage && bodyMessageType === "text") bodyMessageType = "text_image";
        else if (!bodyMessage) bodyMessageType = "image";
      }
    }

    let shiftName = null;
    if (shiftId && mongoose.Types.ObjectId.isValid(String(shiftId))) {
      const shift = await Shift.findOne({ _id: shiftId, libraryId }).select("name").lean();
      shiftName = shift?.name || null;
    }

    const result = await sendCommunicationMessage({
      libraryId,
      createdBy: req.user.libraryId || libraryId,
      title,
      message: bodyMessage,
      imageUrl,
      documentUrl,
      messageType: bodyMessageType,
      audience,
      studentIds,
      shiftId,
      shiftName,
      category,
    });

    res.status(201).json(result);
  })
);

/**
 * PATCH /api/communications/:id
 * Body: { title, message }
 */
router.patch(
  "/:id",
  requireAuth,
  requireRole("library", "admin"),
  requireNotExpiredSubscription,
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.body.libraryId || req.query.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }

    const campaignId = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw createHttpError(400, "Invalid message id");
    }

    const title = String(req.body?.title || "").trim();
    const message = String(req.body?.message ?? "").trim();

    const updated = await updateCommunicationCampaign(libraryId, campaignId, { title, message });
    res.json({ ok: true, message: updated });
  })
);

/**
 * DELETE /api/communications/:id
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole("library", "admin"),
  requireNotExpiredSubscription,
  asyncHandler(async (req, res) => {
    const libraryId =
      req.user.role === "admin"
        ? String(req.query.libraryId || "").trim()
        : String(req.user.libraryId || "").trim();
    if (!libraryId || !mongoose.Types.ObjectId.isValid(libraryId)) {
      throw createHttpError(400, "libraryId is required");
    }

    const campaignId = String(req.params.id || "").trim();
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw createHttpError(400, "Invalid message id");
    }

    const result = await deleteCommunicationCampaign(libraryId, campaignId);
    res.json(result);
  })
);

module.exports = router;
