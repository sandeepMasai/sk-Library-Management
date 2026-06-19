const logger = require("../utils/logger");

/**
 * Send Expo push notifications (best-effort; does not throw).
 */
async function sendExpoPushMessages(messages) {
  const batch = (messages || []).filter((m) => m && m.to);
  if (!batch.length) return { sent: 0, failed: 0 };

  const chunks = [];
  for (let i = 0; i < batch.length; i += 100) {
    chunks.push(batch.slice(i, i + 100));
  }

  let sent = 0;
  let failed = 0;

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(chunk),
      });
      const data = await res.json().catch(() => ({}));
      const tickets = Array.isArray(data?.data) ? data.data : [];
      for (const t of tickets) {
        if (t?.status === "ok") sent += 1;
        else failed += 1;
      }
    } catch (error) {
      failed += chunk.length;
      logger.warn("Expo push batch failed", { message: error?.message });
    }
  }

  return { sent, failed };
}

function buildStudentPushPayload({ title, body, imageUrl }) {
  const payload = {
    title: String(title || "New Message From Library").slice(0, 120),
    body: String(body || "").slice(0, 240),
    sound: "default",
  };
  if (imageUrl) payload.data = { imageUrl };
  return payload;
}

module.exports = { sendExpoPushMessages, buildStudentPushPayload };
