const mongoose = require("mongoose");

const MESSAGE_TYPES = ["text", "image", "text_image"];
const AUDIENCE_TYPES = ["all", "active", "expired", "shift", "selected"];

const communicationCampaignSchema = new mongoose.Schema(
  {
    libraryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Library",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, default: "", trim: true, maxlength: 5000 },
    imageUrl: { type: String, default: null, trim: true, maxlength: 2048 },
    messageType: { type: String, enum: MESSAGE_TYPES, default: "text" },
    audience: { type: String, enum: AUDIENCE_TYPES, default: "all" },
    audienceLabel: { type: String, default: "", trim: true, maxlength: 200 },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", default: null },
    recipientCount: { type: Number, default: 0, min: 0 },
    pushSentCount: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Library", default: null },
    sentAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true, strict: true }
);

communicationCampaignSchema.index({ libraryId: 1, sentAt: -1 });

module.exports = mongoose.model("CommunicationCampaign", communicationCampaignSchema);
