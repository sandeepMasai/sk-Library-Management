#!/usr/bin/env node
"use strict";

/**
 * Verify RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET by creating a ₹1 test order.
 * Usage (from backend/): node scripts/verify-razorpay.js
 */
require("dotenv").config();
const Razorpay = require("razorpay");

const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();

if (!keyId || !keySecret) {
  console.error("❌ Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env");
  process.exit(1);
}

const mode = keyId.startsWith("rzp_test_") ? "test" : keyId.startsWith("rzp_live_") ? "live" : "unknown";
console.log("Key ID:", keyId);
console.log("Mode:", mode);
console.log("Secret length:", keySecret.length);

const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

client.orders
  .create({
    amount: 100,
    currency: "INR",
    receipt: `verify_${Date.now()}`.slice(0, 40),
  })
  .then((order) => {
    console.log("✅ Razorpay keys are VALID. Test order:", order.id);
    process.exit(0);
  })
  .catch((err) => {
    const desc = err?.error?.description || err?.message || String(err);
    const code = err?.error?.code || err?.code;
    console.error("❌ Razorpay rejected these keys:", desc, code ? `(${code})` : "");
    console.error("");
    console.error("Fix:");
    console.error("  1. Razorpay Dashboard → Test mode → Settings → API Keys");
    console.error("  2. Regenerate Key Secret (or create new key pair)");
    console.error("  3. Copy Key ID + Secret together into Railway and backend/.env");
    console.error("  4. Redeploy backend, update VITE_RAZORPAY_KEY_ID on Vercel to the same Key ID");
    process.exit(1);
  });
