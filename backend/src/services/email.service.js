const { Resend } = require("resend");
const logger = require("../utils/logger");
const { getFrontendBaseUrlFromEnv } = require("../utils/frontendUrl");

let resendClient;
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

// Configuration
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@smartlibdesk.in";
const EMAIL_OTP_EXPIRY_MINUTES = Number.parseInt(process.env.EMAIL_OTP_EXPIRY_MINUTES || "5", 10) || 5;

/**
 * When true, OTP emails are not sent via Resend; the code is logged to the server console instead.
 * Default: on in non-production unless EMAIL_OTP_DEV_LOG=false.
 * Use this while Resend is in sandbox (only delivers to your Resend account email).
 */
function isOtpDevConsoleEnabled() {
  const flag = String(process.env.EMAIL_OTP_DEV_LOG || "").trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  if (flag === "false" || flag === "0" || flag === "no") return false;
  return (process.env.NODE_ENV || "development") !== "production";
}

function isResendSandboxRecipientError(message) {
  return /only send testing emails to your own email address/i.test(String(message || ""));
}

function logDevOtp({ to, otp, label }) {
  const line = "=".repeat(56);
  const body = [
    line,
    `[DEV OTP] ${label}`,
    `  To:   ${to}`,
    `  Code: ${otp}`,
    "  (Set EMAIL_OTP_DEV_LOG=false and verify a domain on Resend to send real mail.)",
    line,
  ].join("\n");
  logger.warn(body);
  if ((process.env.NODE_ENV || "development") !== "production") {
    // eslint-disable-next-line no-console
    console.warn(`\n📧 ${body}\n`);
  }
}

/**
 * Validate Resend configuration
 */
function assertResendConfigured() {
  if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === "your_resend_api_key_here") {
    throw new Error("RESEND_API_KEY is not configured. Please set it in your environment variables.");
  }
  if (!EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured. Please set it in your environment variables.");
  }
}

/**
 * Beautiful HTML email template wrapper
 */
function createEmailTemplate({ subject, htmlContent, previewText }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      -webkit-font-smoothing: antialiased;
    }
    
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .email-card {
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px;
      text-align: center;
    }
    
    .email-header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    
    .email-header p {
      color: rgba(255, 255, 255, 0.9);
      margin: 8px 0 0 0;
      font-size: 14px;
    }
    
    .email-body {
      padding: 32px;
    }
    
    .email-body h2 {
      color: #1e293b;
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 16px 0;
    }
    
    .email-body p {
      color: #475569;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 16px 0;
    }
    
    .otp-container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    
    .otp-code {
      color: #ffffff;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      margin: 0;
      font-family: 'Courier New', monospace;
    }
    
    .otp-expiry {
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
      margin: 8px 0 0 0;
    }
    
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 16px 0;
    }
    
    .button:hover {
      opacity: 0.9;
    }
    
    .divider {
      height: 1px;
      background: #e2e8f0;
      margin: 32px 0;
    }
    
    .email-footer {
      padding: 24px 32px;
      background: #f8fafc;
      text-align: center;
    }
    
    .email-footer p {
      color: #64748b;
      font-size: 13px;
      margin: 0 0 8px 0;
    }
    
    .email-footer a {
      color: #667eea;
      text-decoration: none;
    }
    
    .security-box {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 16px;
      margin: 16px 0;
      border-radius: 4px;
    }
    
    .security-box p {
      color: #92400e;
      font-size: 13px;
      margin: 0;
    }
    
    @media only screen and (max-width: 600px) {
      .email-container {
        padding: 10px;
      }
      
      .email-header, .email-body, .email-footer {
        padding: 24px;
      }
      
      .otp-code {
        font-size: 28px;
        letter-spacing: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-card">
      ${htmlContent}
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * OTP Email Template
 */
function createOtpEmailTemplate({ otp, expiryMinutes, appName = "SmartLibDesk" }) {
  const subject = `Your Verification Code - ${appName}`;
  const htmlContent = `
    <div class="email-header">
      <h1>🔐 Verify Your Email</h1>
      <p>${appName}</p>
    </div>
    <div class="email-body">
      <h2>Your Verification Code</h2>
      <p>Use the following one-time password (OTP) to verify your email address. This code will expire in ${expiryMinutes} minutes.</p>
      
      <div class="otp-container">
        <p class="otp-code">${otp}</p>
        <p class="otp-expiry">Expires in ${expiryMinutes} minutes</p>
      </div>
      
      <div class="security-box">
        <p>⚠️ <strong>Security Notice:</strong> Never share this code with anyone. Our team will never ask for your OTP.</p>
      </div>
      
      <p>If you didn't request this verification code, you can safely ignore this email.</p>
      
      <div class="divider"></div>
      
      <p>Need help? Contact our support team if you have any questions.</p>
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  `;

  const html = createEmailTemplate({
    subject,
    htmlContent,
    previewText: `Your verification code is: ${otp}`,
  });
  return { html, subject };
}

/**
 * Welcome Email Template
 */
function createWelcomeEmailTemplate({ name, appName = "SmartLibDesk" }) {
  const subject = `Welcome to ${appName}!`;
  const htmlContent = `
    <div class="email-header">
      <h1>🎉 Welcome to ${appName}!</h1>
    </div>
    <div class="email-body">
      <h2>Hello${name ? `, ${name}` : ""}!</h2>
      <p>Welcome to ${appName}! We're thrilled to have you on board.</p>
      
      <p>Your account has been successfully created. You can now:</p>
      <ul style="color: #475569; font-size: 15px; line-height: 1.6; margin: 16px 0;">
        <li>Manage your library membership</li>
        <li>Track your attendance</li>
        <li>Access library resources</li>
        <li>Stay updated with notifications</li>
      </ul>
      
      <p>If you have any questions or need assistance, our support team is here to help.</p>
      
      <div class="divider"></div>
      
      <p>Get started by logging into your account and exploring all the features!</p>
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  `;

  const html = createEmailTemplate({
    subject,
    htmlContent,
    previewText: `Welcome to ${appName}!`,
  });
  return { html, subject };
}

/**
 * Email Verification Success Template
 */
function createVerificationSuccessTemplate({ appName = "SmartLibDesk" }) {
  const subject = `Email Verified Successfully - ${appName}`;
  const htmlContent = `
    <div class="email-header">
      <h1>✅ Email Verified Successfully</h1>
      <p>${appName}</p>
    </div>
    <div class="email-body">
      <h2>Congratulations!</h2>
      <p>Your email address has been successfully verified. Your account is now fully activated and ready to use.</p>
      
      <p>You can now enjoy all the features of ${appName} without any restrictions.</p>
      
      <div style="text-align: center;">
        <a href="${getFrontendBaseUrlFromEnv() || "https://libdesk.in"}" class="button">Go to Dashboard</a>
      </div>
      
      <div class="divider"></div>
      
      <p>If you have any questions or need assistance, our support team is here to help.</p>
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  `;

  const html = createEmailTemplate({
    subject,
    htmlContent,
    previewText: "Your email has been verified successfully",
  });
  return { html, subject };
}

/**
 * Send email using Resend
 */
async function sendEmail({ to, subject, html, text }) {
  assertResendConfigured();

  try {
    const result = await getResend().emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    // Resend Node SDK returns { data, error } without always throwing on failure.
    if (result?.error) {
      const errMsg =
        typeof result.error === "string"
          ? result.error
          : result.error?.message || JSON.stringify(result.error);
      throw new Error(errMsg);
    }

    logger.info("Email sent successfully", {
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      messageId: result?.data?.id,
    });

    return { success: true, messageId: result?.data?.id };
  } catch (error) {
    logger.error("Failed to send email", {
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      error: error.message,
      stack: error.stack,
    });

    const err = new Error(`Failed to send email: ${error.message}`);
    if (isResendSandboxRecipientError(error.message)) {
      err.code = "RESEND_SANDBOX_RECIPIENT";
    }
    throw err;
  }
}

/**
 * Send OTP email
 */
async function sendOtpEmail({ to, otp, expiryMinutes = EMAIL_OTP_EXPIRY_MINUTES, appName }) {
  if (isOtpDevConsoleEnabled()) {
    logDevOtp({ to, otp, label: `Verification OTP (${appName || "SmartLibDesk"})` });
    return { success: true, devMode: true };
  }
  const { html, subject } = createOtpEmailTemplate({ otp, expiryMinutes, appName });
  try {
    return await sendEmail({ to, subject, html, text: `Your verification code is: ${otp}` });
  } catch (error) {
    if (isResendSandboxRecipientError(error.message)) {
      logDevOtp({
        to,
        otp,
        label: `Verification OTP — Resend sandbox fallback (${appName || "SmartLibDesk"})`,
      });
      return { success: true, devMode: true, sandboxFallback: true };
    }
    throw error;
  }
}

/**
 * Password reset OTP (forgot password) — distinct copy from generic email verification.
 */
function createPasswordResetOtpEmailTemplate({ otp, expiryMinutes, appName = "SmartLibDesk" }) {
  const subject = `Your password reset code — ${appName}`;
  const htmlContent = `
    <div class="email-header">
      <h1>🔐 Reset your password</h1>
      <p>${appName}</p>
    </div>
    <div class="email-body">
      <h2>Your one-time code</h2>
      <p><strong>Your ${appName} password reset OTP is ${otp}</strong></p>
      <p>This code expires in ${expiryMinutes} minutes. If you did not request a reset, ignore this email.</p>
      <div class="otp-container">
        <p class="otp-code">${otp}</p>
        <p class="otp-expiry">Expires in ${expiryMinutes} minutes</p>
      </div>
      <div class="security-box">
        <p>⚠️ Never share this code. ${appName} staff will never ask for it.</p>
      </div>
    </div>
    <div class="email-footer">
      <p>© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  `;
  const html = createEmailTemplate({
    subject,
    htmlContent,
    previewText: `Your ${appName} password reset OTP is ${otp}`,
  });
  return { html, subject };
}

async function sendPasswordResetOtpEmail({ to, otp, expiryMinutes = EMAIL_OTP_EXPIRY_MINUTES, appName }) {
  if (isOtpDevConsoleEnabled()) {
    logDevOtp({ to, otp, label: `Password reset OTP (${appName || "SmartLibDesk"})` });
    return { success: true, devMode: true };
  }
  const { html, subject } = createPasswordResetOtpEmailTemplate({ otp, expiryMinutes, appName });
  try {
    return await sendEmail({
      to,
      subject,
      html,
      text: `Your ${appName || "SmartLibDesk"} password reset OTP is ${otp}. It expires in ${expiryMinutes} minutes.`,
    });
  } catch (error) {
    if (isResendSandboxRecipientError(error.message)) {
      logDevOtp({
        to,
        otp,
        label: `Password reset OTP — Resend sandbox fallback (${appName || "SmartLibDesk"})`,
      });
      return { success: true, devMode: true, sandboxFallback: true };
    }
    throw error;
  }
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail({ to, name, appName }) {
  const { html, subject } = createWelcomeEmailTemplate({ name, appName });
  return sendEmail({ to, subject, html, text: `Welcome to ${appName}!` });
}

/**
 * Send verification success email
 */
async function sendVerificationSuccessEmail({ to, appName }) {
  const { html, subject } = createVerificationSuccessTemplate({ appName });
  return sendEmail({ to, subject, html, text: "Your email has been verified successfully" });
}

module.exports = {
  assertResendConfigured,
  isOtpDevConsoleEnabled,
  isResendSandboxRecipientError,
  sendEmail,
  sendOtpEmail,
  sendPasswordResetOtpEmail,
  sendWelcomeEmail,
  sendVerificationSuccessEmail,
  createOtpEmailTemplate,
  createWelcomeEmailTemplate,
  createVerificationSuccessTemplate,
};
