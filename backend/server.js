require("dotenv").config();

const mongoose = require("mongoose");

const { connectToMongo } = require("./src/config/db");
const logger = require("./src/utils/logger");
const { startSubscriptionExpiryJob } = require("./src/jobs/subscriptionExpiry.job");
const { startEmailOtpCleanupJob } = require("./src/jobs/emailOtpCleanup.job");
const app = require("./src/app");

/** Railway injects PORT — do not hardcode 1998 in Railway Variables. */
const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";

async function start() {
  if (!Number.isFinite(PORT) || PORT <= 0) {
    logger.error("Invalid PORT", { raw: process.env.PORT });
    process.exit(1);
  }

  // Listen first so Railway health/proxy gets a response (avoids 502 while DB connects).
  const server = app.listen(PORT, HOST, () => {
    logger.info("Backend server started", {
      env: process.env.NODE_ENV || "development",
      host: HOST,
      port: PORT,
    });
  });

  const dbConnected = await connectToMongo();

  if (!dbConnected) {
    logger.error("MongoDB connection failed — API routes may error until DB is fixed");
  } else {
    logger.info("MongoDB ready");
    if (process.env.SUBSCRIPTION_CRON_ENABLED === "true") {
      startSubscriptionExpiryJob();
    }
    if (process.env.EMAIL_OTP_CRON_ENABLED === "true") {
      startEmailOtpCleanupJob();
    }
  }

  server.on("error", (err) => {
    logger.error("HTTP server error", {
      message: err?.message,
      code: err?.code,
    });

    process.exit(1);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("Shutting down server");

    await mongoose.connection.close();

    process.exit(0);
  });

  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled Rejection", {
      message: err?.message,
    });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught Exception", {
      message: err?.message,
    });

    process.exit(1);
  });
}

start();