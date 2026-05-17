"use strict";

/**
 * Process entry — Railway runs: npm start → node server.js
 * Express app lives in src/app.js; listen + lifecycle in src/server/bootstrap.js
 */
require("dotenv").config();

const { bootstrap } = require("./src/server/bootstrap");
const logger = require("./src/utils/logger");

if (require.main === module) {
  bootstrap().catch((err) => {
    logger.error("Fatal bootstrap error", {
      message: err?.message,
      stack: err?.stack,
    });
    process.exit(1);
  });
}

module.exports = { bootstrap };
