const { sendEmail } = require("./email.service");
const { createHttpError } = require("../utils/httpError");
const { isValidEmail } = require("../utils/inputValidation");

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendContactEmail({ name, email, phone, message }) {
  const to = String(process.env.CONTACT_TO_EMAIL || "").trim();
  if (!to) {
    throw createHttpError(503, "Contact form is not configured. Please email us directly.");
  }

  const subject = `[SmartLibDesk] Contact from ${name}`;
  const html = `
    <h2>New website contact message</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Phone:</strong> ${escapeHtml(phone || "—")}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>
  `;
  const text = `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "—"}\n\n${message}`;

  await sendEmail({ to, subject, html, text });
}

function validateContactBody(body = {}) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = body.phone == null ? "" : String(body.phone).trim();
  const message = String(body.message || "").trim();

  if (!name || name.length < 2) throw createHttpError(400, "Name is required (min 2 characters)");
  if (!email || !isValidEmail(email)) throw createHttpError(400, "Valid email is required");
  if (!message || message.length < 10) throw createHttpError(400, "Message is required (min 10 characters)");
  if (phone && phone.replace(/\D/g, "").length > 0 && phone.replace(/\D/g, "").length < 10) {
    throw createHttpError(400, "Invalid phone number");
  }
  if (name.length > 120 || email.length > 254 || message.length > 5000 || phone.length > 20) {
    throw createHttpError(400, "Input too long");
  }

  return { name, email, phone: phone || undefined, message };
}

module.exports = {
  sendContactEmail,
  validateContactBody,
};
