const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * One-time proof that an email OTP was verified before POST /api/auth/register-library.
 * Raw token is sent to the client once; only SHA-256 hash is stored.
 */
const libraryRegistrationSessionSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
      index: true,
    },
    tokenHash: { type: String, required: true, maxlength: 64, index: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true }
);

libraryRegistrationSessionSchema.index({ email: 1, tokenHash: 1 });

libraryRegistrationSessionSchema.statics.hashToken = function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
};

libraryRegistrationSessionSchema.statics.createSession = async function createSession({
  email,
  ttlMinutes = 30,
}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = this.hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await this.create({ email: normalizedEmail, tokenHash, expiresAt });
  return { rawToken: raw, expiresAt };
};

libraryRegistrationSessionSchema.statics.consumeValidSession = async function consumeValidSession({
  email,
  rawToken,
}) {
  const tokenHash = this.hashToken(rawToken);
  const doc = await this.findOne({
    email: String(email || "").trim().toLowerCase(),
    tokenHash,
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });
  if (!doc) return { ok: false, reason: "invalid_or_expired" };
  doc.usedAt = new Date();
  await doc.save();
  return { ok: true, session: doc };
};

module.exports = mongoose.model("LibraryRegistrationSession", libraryRegistrationSessionSchema);
