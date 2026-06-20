"use strict";

/**
 * Railway / production entry: npm start → node server.js
 * - app.js: Express app only
 * - server.js: HTTP listen + lifecycle (MongoDB, jobs, SIGTERM)
 */
require("dotenv").config();

const app = require("./app");
const logger = require("./src/utils/logger");
const {
  setServer,
  registerProcessHandlers,
  connectDatabaseAsync,
  startBackgroundJobs,
} = require("./src/server/lifecycle");

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

async function startHttpServer(port, host) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => resolve(server));
    server.on("error", reject);
  });
}

async function main() {
  const PORT = parsePort();
  const HOST = parseHost();
  const nodeEnv = process.env.NODE_ENV || "development";

  registerProcessHandlers();

  logger.info("SmartLibDesk backend starting", {
    pid: process.pid,
    node: process.version,
    env: nodeEnv,
    host: HOST,
    port: PORT,
    hasMongoUri: Boolean(process.env.MONGODB_URI || process.env.MONGO_URI),
  });

  const server = await startHttpServer(PORT, HOST);
  setServer(server);

  logger.info("HTTP server listening — /health ready", {
    host: HOST,
    port: PORT,
    url: `http://${HOST}:${PORT}/health`,
  });

  connectDatabaseAsync()
    .then((dbConnected) => {
      startBackgroundJobs(dbConnected);
      logger.info("Background bootstrap finished", { dbConnected });
      warnRazorpayKeysAsync();
    })
    .catch((err) => {
      logger.error("Background bootstrap error", { message: err?.message });
    });
}

function warnRazorpayKeysAsync() {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    logger.warn("Razorpay keys missing — website payment checkout will fail until configured");
    return;
  }
  try {
    const Razorpay = require("razorpay");
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });
    client.orders
      .create({
        amount: 100,
        currency: "INR",
        receipt: `boot_${Date.now()}`.slice(0, 40),
      })
      .then(() => {
        logger.info("Razorpay keys OK — payment checkout ready", {
          keyId: `${keyId.slice(0, 12)}…${keyId.slice(-4)}`,
        });
      })
      .catch((err) => {
        logger.error("Razorpay keys INVALID — payment page will not open", {
          message: err?.error?.description || err?.message,
          keyId: `${keyId.slice(0, 12)}…${keyId.slice(-4)}`,
          fix: "Razorpay Dashboard → Test mode → API Keys → regenerate secret → update backend/.env → restart",
        });
      });
  } catch (err) {
    logger.warn("Razorpay startup check skipped", { message: err?.message });
  }
}

if (require.main === module) {
  main().catch((err) => {
    logger.error("Fatal: could not start HTTP server", {
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
    });
    process.exit(1);
  });
}

module.exports = { main };
