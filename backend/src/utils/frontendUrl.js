/**
 * Build absolute URLs for the web app (Expo web, Vite, etc.).
 * Emails must never point at the API origin (e.g. :1998) unless that host serves the SPA.
 */

function normalizeFrontendBaseUrl(raw) {
  if (raw == null || typeof raw !== "string") return "";
  let u = raw.trim();
  u = u.replace(/\/+$/, "");
  return u;
}

/**
 * @returns {string} Base URL with no trailing slash, or "" if unset.
 */
function getFrontendBaseUrlFromEnv() {
  return normalizeFrontendBaseUrl(process.env.FRONTEND_URL);
}

/**
 * @throws {Error} if FRONTEND_URL is missing or not http(s)
 */
function assertFrontendUrlConfigured() {
  const base = getFrontendBaseUrlFromEnv();
  if (!base) {
    throw new Error(
      "FRONTEND_URL is not set. Set it in .env to your web app origin, e.g. http://localhost:8081 (Expo web) or http://localhost:5173 (Vite)."
    );
  }
  try {
    const u = new URL(base);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new Error("FRONTEND_URL must be http or https");
    }
  } catch (e) {
    throw new Error(`FRONTEND_URL is invalid: ${e.message}`);
  }
  return base;
}

module.exports = {
  normalizeFrontendBaseUrl,
  getFrontendBaseUrlFromEnv,
  assertFrontendUrlConfigured,
};
