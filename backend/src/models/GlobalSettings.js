const mongoose = require("mongoose");

const urlRegex = /^https?:\/\/.+/i;
const phoneRegex = /^\+?[1-9]\d{7,14}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function optionalUrl(v) {
  if (v == null || v === "") return true;
  return urlRegex.test(String(v).trim());
}

function optionalPhone(v) {
  if (v == null || v === "") return true;
  const s = String(v).trim();
  return phoneRegex.test(s) || /^\d{10,15}$/.test(s.replace(/\D/g, ""));
}

function optionalEmail(v) {
  if (v == null || v === "") return true;
  return emailRegex.test(String(v).trim().toLowerCase());
}

const GlobalSettingsSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      default: "global",
      immutable: true,
    },

    privacyPolicyUrl: {
      type: String,
      required: true,
      trim: true,
      match: urlRegex,
    },

    termsUrl: {
      type: String,
      required: true,
      trim: true,
      match: urlRegex,
    },

    communication: {
      type: {
        whatsapp: {
          type: String,
          default: null,
          trim: true,
          validate: { validator: optionalPhone, message: "Invalid WhatsApp number" },
        },

        channel: {
          type: String,
          default: null,
          trim: true,
          validate: { validator: optionalUrl, message: "Channel link must be http(s) URL" },
        },

        email: {
          type: String,
          default: null,
          trim: true,
          lowercase: true,
          validate: { validator: optionalEmail, message: "Invalid support email" },
        },
      },

      default: () => ({}),
    },
  },
  {
    timestamps: {
      createdAt: false,
      updatedAt: true,
    },

    toJSON: {
      versionKey: false,
    },
  }
);

module.exports = mongoose.model(
  "GlobalSettings",
  GlobalSettingsSchema
);