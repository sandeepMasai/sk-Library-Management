const mongoose = require("mongoose");
const Student = require("../models/Student");
const Library = require("../models/Library");
const SeatAllocation = require("../models/SeatAllocation");
const Notification = require("../models/Notification");
const CommunicationCampaign = require("../models/CommunicationCampaign");
const StudentPushToken = require("../models/StudentPushToken");
const { getSignedDocumentDownloadUrl } = require("../utils/cloudinary");
const { sendExpoPushMessages, buildStudentPushPayload } = require("./expoPush.service");
const { createHttpError } = require("../utils/httpError");
const { renderTemplate, PLACEHOLDER_TOKEN_RE } = require("../utils/templateRender");

const RECIPIENT_FIELDS = "_id name expiryDate feeAmount";

function toUtcStartOfDay(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function normalizeMessageType(raw) {
  const t = String(raw || "text").trim().toLowerCase();
  if (t === "text+image" || t === "text_image") return "text_image";
  if (t === "image") return "image";
  if (t === "pdf") return "pdf";
  if (t === "text+pdf" || t === "text_pdf") return "text_pdf";
  return "text";
}

function audienceLabel(audience, count, shiftName) {
  if (audience === "all") return `All students (${count})`;
  if (audience === "active") return `Active students (${count})`;
  if (audience === "expired") return `Expired students (${count})`;
  if (audience === "shift") return `Shift: ${shiftName || "—"} (${count})`;
  if (audience === "selected") return `Selected students (${count})`;
  return `${count} students`;
}

function formatDueDate(expiryDate) {
  if (!expiryDate) return "";
  const d = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function templateVarsForStudent(student, libraryName) {
  const amount = student?.feeAmount;
  return {
    student_name: String(student?.name || "").trim(),
    library_name: String(libraryName || "").trim(),
    due_date: formatDueDate(student?.expiryDate),
    amount: amount == null || amount === "" ? "" : String(amount),
  };
}

function hasTemplatePlaceholders(text) {
  PLACEHOLDER_TOKEN_RE.lastIndex = 0;
  return PLACEHOLDER_TOKEN_RE.test(String(text || ""));
}

function personalizeText(text, student, libraryName) {
  const src = String(text || "");
  if (!hasTemplatePlaceholders(src)) return src;
  return renderTemplate(src, templateVarsForStudent(student, libraryName));
}

async function resolveRecipients(libraryId, { audience, studentIds = [], shiftId = null }) {
  const lid = new mongoose.Types.ObjectId(String(libraryId));
  const base = { libraryId: lid, isDeleted: false };

  if (audience === "all") {
    return Student.find(base).select(RECIPIENT_FIELDS).lean();
  }

  if (audience === "active") {
    const today = toUtcStartOfDay(new Date());
    return Student.find({ ...base, isBlocked: false, expiryDate: { $gte: today } }).select(RECIPIENT_FIELDS).lean();
  }

  if (audience === "expired") {
    const today = toUtcStartOfDay(new Date());
    return Student.find({ ...base, expiryDate: { $lt: today } }).select(RECIPIENT_FIELDS).lean();
  }

  if (audience === "shift") {
    const sid = String(shiftId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(sid)) {
      throw createHttpError(400, "shiftId is required for shift audience");
    }
    const allocations = await SeatAllocation.find({
      libraryId: lid,
      shiftId: new mongoose.Types.ObjectId(sid),
      status: "active",
    })
      .select("studentId")
      .lean();
    const ids = [...new Set(allocations.map((a) => String(a.studentId)).filter(Boolean))];
    if (!ids.length) return [];
    return Student.find({ ...base, _id: { $in: ids } }).select(RECIPIENT_FIELDS).lean();
  }

  if (audience === "selected") {
    const ids = (Array.isArray(studentIds) ? studentIds : [])
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (!ids.length) throw createHttpError(400, "Select at least one student");
    return Student.find({ ...base, _id: { $in: ids } }).select(RECIPIENT_FIELDS).lean();
  }

  throw createHttpError(400, "Invalid audience");
}

async function sendCommunicationMessage({
  libraryId,
  createdBy,
  title,
  message,
  imageUrl,
  documentUrl,
  messageType,
  audience,
  studentIds,
  shiftId,
  shiftName,
  category = "general",
}) {
  const t = String(title || "").trim();
  const m = String(message || "").trim();
  const img = String(imageUrl || "").trim() || null;
  const doc = String(documentUrl || "").trim() || null;
  const type = normalizeMessageType(messageType);

  if (!t) throw createHttpError(400, "title is required");
  if (type === "text" && !m) throw createHttpError(400, "message is required for text messages");
  if (type === "image" && !img) throw createHttpError(400, "image is required for image messages");
  if (type === "text_image" && (!m || !img)) {
    throw createHttpError(400, "Both message and image are required for text + image");
  }
  if (type === "pdf" && !doc) throw createHttpError(400, "PDF document is required for pdf messages");
  if (type === "text_pdf" && (!m || !doc)) {
    throw createHttpError(400, "Both message and PDF are required for text + PDF");
  }

  const aud = String(audience || "all").trim().toLowerCase();
  const recipients = await resolveRecipients(libraryId, {
    audience: aud,
    studentIds,
    shiftId,
  });

  if (!recipients.length) {
    throw createHttpError(400, "No students match the selected audience");
  }

  const library = await Library.findById(libraryId).select("name").lean();
  const libraryName = String(library?.name || "").trim();
  const personalized = hasTemplatePlaceholders(t) || hasTemplatePlaceholders(m);
  const usePerStudentDelivery = personalized || aud !== "all";

  const now = new Date();
  const campaign = await CommunicationCampaign.create({
    libraryId,
    title: t,
    message: m,
    imageUrl: img,
    documentUrl: doc,
    messageType: type,
    audience: aud,
    audienceLabel: audienceLabel(aud, recipients.length, shiftName),
    shiftId: shiftId && mongoose.Types.ObjectId.isValid(String(shiftId)) ? shiftId : null,
    recipientCount: recipients.length,
    pushSentCount: 0,
    createdBy: createdBy || null,
    sentAt: now,
  });

  const campaignId = campaign._id;
  const notificationDocs = [];

  if (!usePerStudentDelivery) {
    notificationDocs.push({
      libraryId,
      title: t,
      message: m,
      imageUrl: img,
      documentUrl: doc,
      messageType: type,
      campaignId,
      targetType: "all",
      targetId: null,
      category,
      date: now,
      priority: "normal",
      createdBy,
      senderLabel: "Library",
    });
  } else {
    for (const student of recipients) {
      notificationDocs.push({
        libraryId,
        title: personalizeText(t, student, libraryName),
        message: personalizeText(m, student, libraryName),
        imageUrl: img,
        documentUrl: doc,
        messageType: type,
        campaignId,
        targetType: "student",
        targetId: student._id,
        category,
        date: now,
        priority: "normal",
        createdBy,
        senderLabel: "Library",
      });
    }
  }

  await Notification.insertMany(notificationDocs);

  const recipientIds = recipients.map((r) => r._id);
  const tokens = await StudentPushToken.find({
    libraryId,
    studentId: { $in: recipientIds },
  })
    .select("expoPushToken studentId")
    .lean();

  const studentById = new Map(recipients.map((r) => [String(r._id), r]));

  const pushMessages = tokens.map((tok) => {
    const student = studentById.get(String(tok.studentId));
    const renderedTitle = student ? personalizeText(t, student, libraryName) : t;
    const renderedMessage = student ? personalizeText(m, student, libraryName) : m;
    const pushBody = renderedMessage || renderedTitle;
    return {
      to: tok.expoPushToken,
      ...buildStudentPushPayload({
        title: renderedTitle,
        body: pushBody,
        imageUrl: img,
      }),
    };
  });

  const pushResult = await sendExpoPushMessages(pushMessages);
  if (pushResult.sent > 0) {
    await CommunicationCampaign.updateOne(
      { _id: campaignId },
      { $set: { pushSentCount: pushResult.sent } }
    );
  }

  return {
    ok: true,
    campaignId: campaignId.toString(),
    recipientCount: recipients.length,
    pushSentCount: pushResult.sent,
    notificationCount: notificationDocs.length,
  };
}

async function listCommunicationHistory(libraryId, { limit = 50 } = {}) {
  const rows = await CommunicationCampaign.find({ libraryId })
    .sort({ sentAt: -1 })
    .limit(Math.min(Math.max(Number(limit) || 50, 1), 200))
    .lean();

  const campaignIds = rows.map((r) => r._id).filter(Boolean);
  const readByCampaign = new Map();

  if (campaignIds.length) {
    const readAgg = await Notification.aggregate([
      { $match: { libraryId: new mongoose.Types.ObjectId(String(libraryId)), campaignId: { $in: campaignIds } } },
      {
        $project: {
          campaignId: 1,
          readCount: {
            $size: {
              $filter: {
                input: { $ifNull: ["$readReceipts", []] },
                as: "r",
                cond: { $ne: ["$$r.userId", null] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: "$campaignId",
          readCount: { $sum: { $cond: [{ $gt: ["$readCount", 0] }, 1, 0] } },
        },
      },
    ]);
    for (const row of readAgg) {
      readByCampaign.set(String(row._id), row.readCount || 0);
    }
  }

  return rows.map((r) => ({
    id: r._id.toString(),
    title: r.title,
    message: r.message,
    imageUrl: r.imageUrl || null,
    documentUrl: r.documentUrl ? getSignedDocumentDownloadUrl(r.documentUrl) : null,
    messageType: r.messageType,
    audience: r.audience,
    audienceLabel: r.audienceLabel,
    recipientCount: r.recipientCount,
    pushSentCount: r.pushSentCount || 0,
    readCount: readByCampaign.get(String(r._id)) || 0,
    sentAt: r.sentAt?.toISOString?.() || null,
  }));
}

async function getCommunicationStats(libraryId) {
  const lid = new mongoose.Types.ObjectId(String(libraryId));
  const campaigns = await CommunicationCampaign.find({ libraryId: lid }).select("recipientCount pushSentCount").lean();
  const totalSent = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);
  const delivered = campaigns.reduce((sum, c) => sum + (c.pushSentCount || 0), 0);

  const readAgg = await Notification.aggregate([
    { $match: { libraryId: lid, campaignId: { $ne: null } } },
    {
      $project: {
        hasRead: { $gt: [{ $size: { $ifNull: ["$readReceipts", []] } }, 0] },
      },
    },
    { $group: { _id: null, read: { $sum: { $cond: ["$hasRead", 1, 0] } } } },
  ]);
  const read = readAgg[0]?.read || 0;
  const pending = Math.max(0, totalSent - read);

  return { totalSent, delivered, read, pending, campaignCount: campaigns.length };
}

async function updateCommunicationCampaign(libraryId, campaignId, { title, message }) {
  const lid = new mongoose.Types.ObjectId(String(libraryId));
  const cid = new mongoose.Types.ObjectId(String(campaignId));

  const t = String(title || "").trim();
  const m = String(message || "").trim();
  if (!t) throw createHttpError(400, "title is required");

  const campaign = await CommunicationCampaign.findOne({ _id: cid, libraryId: lid });
  if (!campaign) throw createHttpError(404, "Message not found");

  const hasImage = Boolean(campaign.imageUrl && String(campaign.imageUrl).trim());
  const hasDocument = Boolean(campaign.documentUrl && String(campaign.documentUrl).trim());
  if (!m && !hasImage && !hasDocument) {
    throw createHttpError(400, "message is required");
  }

  let finalMessage = m;
  if (hasDocument) {
    const pdfUrl = String(campaign.documentUrl).trim();
    const pdfLine = `📎 PDF: ${pdfUrl}`;
    if (!finalMessage.includes(pdfUrl)) {
      finalMessage = finalMessage ? `${finalMessage}\n\n${pdfLine}` : pdfLine;
    }
  }

  campaign.title = t;
  campaign.message = finalMessage;
  await campaign.save();

  await Notification.updateMany(
    { libraryId: lid, campaignId: cid },
    { $set: { title: t, message: finalMessage } }
  );

  return {
    id: campaign._id.toString(),
    title: t,
    message: finalMessage,
    imageUrl: campaign.imageUrl || null,
    documentUrl: campaign.documentUrl || null,
    messageType: campaign.messageType,
    audience: campaign.audience,
    audienceLabel: campaign.audienceLabel,
    recipientCount: campaign.recipientCount,
    pushSentCount: campaign.pushSentCount || 0,
    sentAt: campaign.sentAt?.toISOString?.() || null,
  };
}

async function deleteCommunicationCampaign(libraryId, campaignId) {
  const lid = new mongoose.Types.ObjectId(String(libraryId));
  const cid = new mongoose.Types.ObjectId(String(campaignId));

  const campaign = await CommunicationCampaign.findOne({ _id: cid, libraryId: lid });
  if (!campaign) throw createHttpError(404, "Message not found");

  const notifResult = await Notification.deleteMany({ libraryId: lid, campaignId: cid });
  await CommunicationCampaign.deleteOne({ _id: cid, libraryId: lid });

  return {
    ok: true,
    deletedNotifications: notifResult.deletedCount || 0,
  };
}

module.exports = {
  resolveRecipients,
  sendCommunicationMessage,
  listCommunicationHistory,
  getCommunicationStats,
  updateCommunicationCampaign,
  deleteCommunicationCampaign,
};
