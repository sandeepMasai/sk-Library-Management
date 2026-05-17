"use strict";

const mongoose = require("mongoose");

const app = require("../app");
const { connectToMongo, disconnectFromMongo } = require("../config/db");
const { startSubscriptionExpiryJob } = require("../jobs/subscriptionExpiry.job");
const { startEmailOtpCleanupJob } = require("../jobs/emailOtpCleanup.job");
const logger = require("../utils/logger");

const SHUTDOWN_TIMEOUT_MS = Number(process.env.SHUTDOWN_TIMEOUT_MS || 25_000);
const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

let server = null;
let bootstrapped = false;
let shuttingDown = false;

function parsePort() {
  const raw = process.env.PORT;
  const parsed = Number(raw);
  if (raw !== undefined && raw !== "" && Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 8080;
}

function parseHost() {
  const host = String(process.env.HOST || "0.0.0.0").trim();
  return host || "0.0.0.0";
}

function logStartupBanner(port, host) {
  logger.info("SmartLibDesk backend booting", {
    pid: process.pid,
    node: process.version,
    env: NODE_ENV,
    host,
    port,
    hasMongoUri: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
  });
}

async function connectDatabase() {
  try {
    const connected = await connectToMongo();
    if (!connected) {
      logger.error("MongoDB connection failed — HTTP server stays up; fix MONGODB_URI on Railway");
      return false;
    }
    logger.info("MongoDB ready");
    return true;
  } catch (err) {
    logger.error("MongoDB connection error", {
      message: err?.message,
      stack: IS_PRODUCTION ? undefined : err?.stack,
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
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", {
      message: reason?.message || String(reason),
    });
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", {
      message: err?.message,
      stack: err?.stack,
    });
    void shutdown("uncaughtException", 1);
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM", 0);
  });

  process.on("SIGINT", () => {
    void shutdown("SIGINT", 0);
  });
}

async function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Graceful shutdown started", { signal });

  const forceExit = setTimeout(() => {
    logger.error("Shutdown timeout exceeded, forcing exit", {
      timeoutMs: SHUTDOWN_TIMEOUT_MS,
    });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  if (typeof forceExit.unref === "function") forceExit.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      logger.info("HTTP server closed");
    }

    await disconnectFromMongo();
  } catch (err) {
    logger.error("Shutdown error", { message: err?.message });
    exitCode = 1;
  } finally {
    clearTimeout(forceExit);
    logger.info("Shutdown complete", { signal, exitCode });
    process.exit(exitCode);
  }
}

/**
 * Single bootstrap path — prevents duplicate listen if invoked twice.
 * @returns {import('http').Server}
 */
async function bootstrap() {
  if (bootstrapped) {
    logger.warn("bootstrap() called again — ignoring duplicate start");
    return server;
  }
  bootstrapped = true;

  const PORT = parsePort();
  const HOST = parseHost();

  logStartupBanner(PORT, HOST);
  registerProcessHandlers();

  await new Promise((resolve, reject) => {
    server = app.listen(PORT, HOST, () => {
      logger.info("HTTP server listening", { host: HOST, port: PORT, env: NODE_ENV });
      resolve();
    });
    server.on("error", (err) => {
      logger.error("HTTP server failed to start", {
        message: err?.message,
        code: err?.code,
      });
      reject(err);
    });
  });

  const dbConnected = await connectDatabase();
  startBackgroundJobs(dbConnected);

  logger.info("Bootstrap complete — process ready", {
    port: PORT,
    dbConnected,
  });

  return server;
}

module.exports = { bootstrap, shutdown };
