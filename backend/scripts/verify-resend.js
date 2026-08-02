#!/usr/bin/env node
"use strict";

/**
 * Verify Resend email configuration (API key + sender domain).
 * Usage (from backend/): npm run verify:resend
 */
require("dotenv").config();
const { Resend } = require("resend");

const key = String(process.env.RESEND_API_KEY || "").trim();
const from = String(process.env.EMAIL_FROM || "noreply@smartlibdesk.in").trim();

if (!key || key === "your_resend_api_key_here") {
  console.error("❌ RESEND_API_KEY is missing in backend/.env");
  console.error("   Get a key at https://resend.com/api-keys and add it to Render env vars too.");
  process.exit(1);
}

console.log("EMAIL_FROM:", from);
console.log("RESEND_API_KEY:", `${key.slice(0, 8)}…`);

const resend = new Resend(key);

async function main() {
  const { data, error } = await resend.domains.list();
  if (error) {
    console.error("❌ Resend rejected the API key:", error.message || error);
    process.exit(1);
  }

  const domains = (data?.data || []).map((d) => ({
    name: d.name,
    status: d.status,
  }));
  console.log("✅ Resend API key is valid");
  console.log("Domains:", domains.length ? JSON.stringify(domains, null, 2) : "(none — add smartlibdesk.in)");

  const fromDomain = from.includes("@") ? from.split("@")[1].toLowerCase() : "";
  const verified = domains.some(
    (d) => d.status === "verified" && (d.name === fromDomain || fromDomain.endsWith(`.${d.name}`))
  );

  if (!verified) {
    console.error("");
    console.error(`❌ Sender ${from} is not on a verified Resend domain.`);
    console.error("   Fix: https://resend.com/domains → add smartlibdesk.in → set DNS records → wait for verified");
    console.error("   Then set EMAIL_FROM=noreply@smartlibdesk.in on Render and redeploy.");
    process.exit(1);
  }

  console.log(`✅ Sender domain looks verified for ${from}`);
  console.log("");
  console.log("Next: ensure Render has RESEND_API_KEY, EMAIL_FROM, and redeploy backend.");
}

main().catch((err) => {
  console.error("❌ verify-resend failed:", err?.message || err);
  process.exit(1);
});
