#!/usr/bin/env node
"use strict";

const crypto = require("crypto");

function secret() {
  return crypto.randomBytes(48).toString("hex");
}

console.log("Paste these into Railway Variables (or backend/.env):\n");
console.log(`AUTH_JWT_SECRET=${secret()}`);
console.log(`AUTH_REFRESH_TOKEN_SECRET=${secret()}`);
