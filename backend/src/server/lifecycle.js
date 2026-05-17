"use strict";

const mongoose = require("mongoose");

const { connectToMongo, disconnectFromMongo } = require("../config/db");
const { startSubscriptionExpiryJob } = require("../jobs/subscriptionExpiry.job");
const { startEmailOtpCleanupJob } = require("../jobs/emailOtpCleanup.job");
const logger = require("../utils/logger");

const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 25_000);
const NODE_ENV = process.env.NODE_ENV || "development";

let httpServer = null;
let handlersRegistered = false;
let shuttingDown = false;

function setServer(server) {
  httpServer = server;
  if (httpServer && typeof httpServer.keepAliveTimeout !== "undefined") {
    httpServer.keepAliveTimeout = Number(process.env.HTTP_KEEP_ALIVE_MS || 65_000);
    httpServer.headersTimeout = Number(process.env.HTTP_HEADERS_TIMEOUT_MS || 66_000);
  }
}

async function connectDatabaseAsync() {
  try {
    const connected = await connectToMongo();
    if (!connected) {
      logger.error("MongoDB not connected — API stays up; set MONGODB_URI on Railway");
      return false;
    }
    logger.info("MongoDB ready");
    return true;
  } catch (err) {
    logger.error("MongoDB connection error", {
      message: err?.message,
      stack: NODE_ENV === "production" ? undefined : err?.stack,
    });
    return false;
  }
}

function startBackgroundJobs(dbConnected) {
  if (!dbConnected) return;
  try {
    if (process.env.SUBSCRIPTION_CRON_ENABLED === "true") {
      startSubscriptionExpiryJob();
    }
    if (process.env.EMAIL_OTP_CRON_ENABLED === "true") {
      startEmailOtpCleanupJob();
    }
  } catch (err) {
    logger.error("Background job startup failed", { message: err?.message });
  }
}

function registerProcessHandlers() {
  if (handlersRegistered) return;
  handlersRegistered = true;

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection (process continues)", {
      message: reason?.message || String(reason),
    });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception (process continues)", {
      message: err?.message,
      stack: err?.stack,
    });
  });

  process.on("SIGTERM", () => {
    logger.info("SIGTERM received (Railway deploy / scale-down)");
    void gracefulShutdown("SIGTERM");
  });

  process.on("SIGINT", () => {
    void gracefulShutdown("SIGINT");
  });
}

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Graceful shutdown started", { signal });

  const forceTimer = setTimeout(() => {
    logger.error("Shutdown timeout — exiting", { timeoutMs: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  if (typeof forceTimer.unref === "function") forceTimer.unref();

  let exitCode = 0;
  try {
    if (httpServer) {
      await new Promise((resolve, reject) => {
        httpServer.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed");
    }
    await disconnectFromMongo();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close().catch(() => {});
    }
  } catch (err) {
    logger.error("Shutdown error", { message: err?.message });
    exitCode = 1;
  } finally {
    clearTimeout(forceTimer);
    logger.info("Shutdown complete", { signal, exitCode });
    process.exit(exitCode);
  }
}

module.exports = {
  setServer,
  registerProcessHandlers,
  connectDatabaseAsync,
  startBackgroundJobs,
  gracefulShutdown,
};
