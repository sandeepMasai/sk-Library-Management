"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PRODUCTION = NODE_ENV === "production";

function collectAllowedOrigins() {
  const set = new Set();
  const add = (value) => {
    const v = String(value || "").trim();
    if (v) set.add(v.replace(/\/$/, ""));
  };

  String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .forEach((s) => add(s));

  add(process.env.FRONTEND_URL);
  add(process.env.WEBSITE_URL);

  if (String(process.env.CORS_ALLOW_LOCALHOST || "").trim().toLowerCase() === "true") {
    [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:5174",
    ].forEach(add);
  }

  return [...set];
}

/** Whitelist origins for browser clients; omit or '*' in development if unset. */
function buildCorsOptions() {
  const list = collectAllowedOrigins();

  /** @type {import('cors').CorsOptions} */
  const base = {
    credentials: Boolean(process.env.CORS_CREDENTIALS === "true" || list.length),
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Correlation-Id",
      "Idempotency-Key",
    ],
    exposedHeaders: [
      "X-Request-Id",
      "X-Correlation-Id",
      "X-Total-Count",
      "X-Page",
      "X-Page-Limit",
      "X-Has-More",
    ],
    maxAge: 86400,
  };

  if (list.length) {
    return {
      ...base,
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (list.includes(origin)) return cb(null, true);
        cb(null, false);
      },
    };
  }

  if (IS_PRODUCTION) {
    // Production without ALLOWED_ORIGINS: reflect nothing (API-only / mobile Bearer).
    return { ...base, origin: false };
  }

  return { ...base, origin: "*" };
}

function resolveMorganFormat() {
  const fmt = String(process.env.MORGAN_FORMAT || "").trim();
  if (fmt) return fmt;
  return IS_PRODUCTION ? "combined" : "dev";
}

/**
 * @param {import('express').Application} app
 */
function attachHttpMiddleware(app) {
  if (process.env.TRUST_PROXY === "true" || IS_PRODUCTION) {
    const hops = Number.parseInt(process.env.TRUST_PROXY_HOPS || "1", 10) || 1;
    app.set("trust proxy", hops);
  }

  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    })
  );

  app.use(
    compression({
      level: Number.parseInt(process.env.COMPRESSION_LEVEL || "6", 10) || 6,
      threshold: Number.parseInt(process.env.COMPRESSION_THRESHOLD || "512", 10) || 512,
    })
  );

  app.use(cors(buildCorsOptions()));

  app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: process.env.URL_ENCODED_LIMIT || "1mb",
    })
  );

  const cookieSecret = String(process.env.COOKIE_SECRET || "").trim();
  app.use(cookieParser(cookieSecret.length ? cookieSecret : undefined));

  const morganFormat = resolveMorganFormat();
  app.use(
    morgan(morganFormat, {
      skip: (req) => req.path === "/health" && process.env.MORGAN_SKIP_HEALTH !== "false",
    })
  );
}

module.exports = {
  attachHttpMiddleware,
};
