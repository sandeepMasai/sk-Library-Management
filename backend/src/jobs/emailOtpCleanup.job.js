const cron = require("node-cron");
const logger = require("../utils/logger");
const { cleanupExpiredOtps } = require("../services/emailOtp.service");
const PasswordResetSession = require("../models/PasswordResetSession");
const LibraryRegistrationSession = require("../models/LibraryRegistrationSession");

let task = null;

async function runEmailOtpCleanup() {
  try {
    const otpResult = await cleanupExpiredOtps();
    const sessionResult = await PasswordResetSession.deleteMany({ expiresAt: { $lt: new Date() } });
    const regSessionResult = await LibraryRegistrationSession.deleteMany({ expiresAt: { $lt: new Date() } });
    logger.info("Email OTP + password reset session cleanup", {
      emailOtpDeleted: otpResult?.deletedCount ?? 0,
      passwordResetSessionsDeleted: sessionResult?.deletedCount ?? 0,
      libraryRegistrationSessionsDeleted: regSessionResult?.deletedCount ?? 0,
    });
  } catch (error) {
    logger.error("Email OTP cleanup job failed", { message: error?.message });
  }
}

function startEmailOtpCleanupJob() {
  if (task) return;
  task = cron.schedule("*/30 * * * *", () => {
    void runEmailOtpCleanup();
  });
  logger.info("Email OTP cleanup job scheduled", { schedule: "*/30 * * * *" });
}

function stopEmailOtpCleanupJob() {
  if (task) {
    task.stop();
    task = null;
  }
}

module.exports = {
  startEmailOtpCleanupJob,
  stopEmailOtpCleanupJob,
  runEmailOtpCleanup,
};
