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
    })
    .catch((err) => {
      logger.error("Background bootstrap error", { message: err?.message });
    });
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
