const mongoose = require("mongoose");
const crypto = require("crypto");

/**
 * Email OTP Model
 * Stores one-time passwords for email verification, password reset, etc.
 */
const EMAIL_OTP_PURPOSES = ["verification", "password_reset", "login", "library_register"];

const emailOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    
    // Hashed OTP (SHA-256) for security
    otpHash: {
      type: String,
      required: true,
      maxlength: 64,
    },
    
    // Expiry time (default 5 minutes)
    expiresAt: {
      type: Date,
      required: true,
    },
    
    // Failed verification attempts
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 1_000_000,
    },
    
    // Purpose of this OTP (verification, password_reset, login)
    purpose: {
      type: String,
      enum: EMAIL_OTP_PURPOSES,
      required: true,
      index: true,
    },
    
    // When the OTP was successfully verified
    verifiedAt: {
      type: Date,
      default: null,
    },
    
    // Associated user ID (optional, for tracking)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    
    // IP address of the request (for security)
    ipAddress: {
      type: String,
      default: null,
      maxlength: 45, // IPv6 max length
    },
    
    // User agent (for security)
    userAgent: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// TTL: MongoDB removes OTP rows after expiresAt (verified rows are also removed by scheduled cleanup)
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for efficient queries
emailOtpSchema.index({ email: 1, purpose: 1, expiresAt: 1 });
emailOtpSchema.index({ email: 1, purpose: 1, verifiedAt: 1 });

/**
 * Hash OTP using SHA-256
 */
function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp || "")).digest("hex");
}

/**
 * Verify OTP against hash
 */
function verifyOtpHash(otp, hash) {
  const computedHash = hashOtp(otp);
  return computedHash === hash;
}

/**
 * Generate a 6-digit OTP
 */
function generateOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

/**
 * Create a new EmailOTP document
 */
emailOtpSchema.statics.createEmailOtp = async function createEmailOtp({
  email,
  otp,
  purpose,
  expiryMinutes = 5,
  ipAddress = null,
  userAgent = null,
  userId = null,
}) {
  const otpHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  
  // Delete any existing unverified OTPs for the same email and purpose
  await this.deleteMany({
    email,
    purpose,
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  });
  
  const emailOtp = await this.create({
    email,
    otpHash,
    expiresAt,
    purpose,
    ipAddress,
    userAgent,
    userId,
  });
  
  return emailOtp;
};

/**
 * Verify OTP and mark as verified
 */
emailOtpSchema.statics.verifyEmailOtp = async function verifyEmailOtp({
  email,
  otp,
  purpose,
  ipAddress = null,
  userAgent = null,
}) {
  const emailOtp = await this.findOne({
    email,
    purpose,
    verifiedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  
  if (!emailOtp) {
    return { success: false, reason: "not_found" };
  }
  
  // Check max attempts
  const maxAttempts = Number.parseInt(process.env.EMAIL_OTP_MAX_ATTEMPTS || "5", 10);
  if (emailOtp.attempts >= maxAttempts) {
    return { success: false, reason: "max_attempts_exceeded" };
  }
  
  // Increment attempts before verification
  emailOtp.attempts += 1;
  
  // Verify OTP hash
  const isValid = verifyOtpHash(otp, emailOtp.otpHash);
  
  if (!isValid) {
    await emailOtp.save();
    return { success: false, reason: "invalid_otp", attemptsRemaining: maxAttempts - emailOtp.attempts };
  }
  
  // Mark as verified
  emailOtp.verifiedAt = new Date();
  if (ipAddress) emailOtp.ipAddress = ipAddress;
  if (userAgent) emailOtp.userAgent = userAgent;
  await emailOtp.save();
  
  return { success: true, emailOtp };
};

/**
 * Check if email can request a new OTP (rate limiting)
 */
emailOtpSchema.statics.canRequestOtp = async function canRequestOtp({
  email,
  purpose,
  cooldownSeconds = 60,
}) {
  const recentOtp = await this.findOne({
    email,
    purpose,
    createdAt: { $gte: new Date(Date.now() - cooldownSeconds * 1000) },
  }).sort({ createdAt: -1 });
  
  if (recentOtp) {
    const secondsSinceLastRequest = Math.floor((Date.now() - recentOtp.createdAt.getTime()) / 1000);
    return { 
      canRequest: false, 
      cooldownRemaining: cooldownSeconds - secondsSinceLastRequest 
    };
  }
  
  return { canRequest: true };
};

/**
 * Clean up expired and verified OTPs
 */
emailOtpSchema.statics.cleanupExpired = async function cleanupExpired() {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { verifiedAt: { $ne: null } },
    ],
  });
  return { deletedCount: result.deletedCount };
};

// Expose helpers
emailOtpSchema.statics.hashOtp = hashOtp;
emailOtpSchema.statics.verifyOtpHash = verifyOtpHash;
emailOtpSchema.statics.generateOtp = generateOtp;
emailOtpSchema.statics.EMAIL_OTP_PURPOSES = EMAIL_OTP_PURPOSES;

module.exports = mongoose.model("EmailOtp", emailOtpSchema);
