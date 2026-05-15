const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * One-time server session after forgot-password email OTP is verified.
 * Client receives a random token once; only SHA-256 hash is stored.
 */
const passwordResetSessionSchema = new mongoose.Schema(
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
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    role: { type: String, required: true, enum: ["library", "student"] },
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, strict: true }
);

passwordResetSessionSchema.index({ email: 1, tokenHash: 1 });

passwordResetSessionSchema.statics.hashToken = function hashToken(raw) {
  return crypto.createHash("sha256").update(String(raw || ""), "utf8").digest("hex");
};

passwordResetSessionSchema.statics.createSession = async function createSession({
  email,
  userId,
  role,
  ttlMinutes = 10,
}) {
  const raw = crypto.randomBytes(32).toString("hex");
  const tokenHash = this.hashToken(raw);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  await this.create({ email, tokenHash, userId, role, expiresAt });
  return { rawToken: raw, expiresAt };
};

passwordResetSessionSchema.statics.consumeValidSession = async function consumeValidSession({
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

module.exports = mongoose.model("PasswordResetSession", passwordResetSessionSchema);
