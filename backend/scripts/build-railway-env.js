#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const dotenv = require("dotenv");

const root = path.join(__dirname, "..");
const localEnv = dotenv.parse(fs.readFileSync(path.join(root, ".env"), "utf8"));

function secret() {
  return crypto.randomBytes(48).toString("hex");
}

const access = secret();
const refresh = secret();

function normalizeMongoUri(uri) {
  const u = String(uri || "").trim();
  if (!u) return u;
  const db = "library_student_management";
  if (/\.mongodb\.net\/?(\?|$)/.test(u)) {
    return u.replace(/\.mongodb\.net\/?(\?|$)/, `.mongodb.net/${db}$1`);
  }
  return u;
}

const out = {
  NODE_ENV: "production",
  HOST: "0.0.0.0",
  MONGODB_URI: normalizeMongoUri(localEnv.MONGODB_URI || localEnv.MONGO_URI),
  ADMIN_USERNAME: localEnv.ADMIN_USERNAME,
  ADMIN_PIN: localEnv.ADMIN_PIN,
  ADMIN_MOBILE: localEnv.ADMIN_MOBILE,
  AUTH_JWT_SECRET: access,
  AUTH_REFRESH_TOKEN_SECRET: refresh,
  JWT_SECRET: access,
  ACCESS_TOKEN_TTL: localEnv.ACCESS_TOKEN_TTL || "15m",
  REFRESH_TOKEN_TTL: localEnv.REFRESH_TOKEN_TTL || "7d",
  AUTH_JWT_ISSUER: localEnv.AUTH_JWT_ISSUER,
  AUTH_JWT_AUDIENCE: localEnv.AUTH_JWT_AUDIENCE,
  AUTH_JWT_ALGORITHMS: localEnv.AUTH_JWT_ALGORITHMS || "HS256",
  TRUST_PROXY: "true",
  SUBSCRIPTION_CRON_ENABLED: "true",
  EMAIL_OTP_CRON_ENABLED: "true",
  RAZORPAY_KEY_ID: localEnv.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: localEnv.RAZORPAY_KEY_SECRET,
  CLOUDINARY_URL: (localEnv.CLOUDINARY_URL || "").trim(),
  RESEND_API_KEY: localEnv.RESEND_API_KEY,
  EMAIL_FROM: localEnv.EMAIL_FROM,
  CONTACT_TO_EMAIL: localEnv.CONTACT_TO_EMAIL,
  ALLOWED_ORIGINS: localEnv.ALLOWED_ORIGINS,
  FRONTEND_URL: localEnv.FRONTEND_URL,
  LOG_LEVEL: localEnv.LOG_LEVEL || "info",
};

const lines = Object.entries(out)
  .filter(([, v]) => v != null && String(v).trim() !== "")
  .map(([k, v]) => `${k}=${String(v).replace(/\n/g, "")}`);

const outPath = path.join(root, ".railway-deploy.env");
fs.writeFileSync(outPath, `${lines.join("\n")}\n`);
console.log(`Wrote ${lines.length} variables to ${outPath}`);
