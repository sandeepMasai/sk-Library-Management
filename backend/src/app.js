const express = require("express");

const { getMongoStatus } = require("./config/db");
const { attachHttpMiddleware } = require("./config/httpStack");
const { errorHandler } = require("./middleware/error.middleware");

const app = express();

attachHttpMiddleware(app);

/** Browser / uptime checks at domain root */
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    service: "smartlibdesk-backend",
    message: "API is running. Use /health or /api/* routes.",
    health: "/health",
    apiPrefix: "/api",
  });
});

/** Railway / load-balancer liveness — always 200 while process is up */
app.get("/health", (_req, res) => {
  const db = getMongoStatus();
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  res.status(200).json({
    ok: true,
    alive: true,
    service: "smartlibdesk-backend",
    env: process.env.NODE_ENV || "development",
    db,
    email: {
      resendConfigured: Boolean(resendKey && resendKey !== "your_resend_api_key_here"),
      from: process.env.EMAIL_FROM || null,
    },
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/public", require("./routes/public.routes"));
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/auth", require("./routes/emailOtp.routes"));
app.use("/api/students", require("./routes/student.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/qr", require("./routes/qr.routes"));
app.use("/api/notifications", require("./routes/notification.routes"));
app.use("/api/communications", require("./routes/communication.routes"));
app.use("/api/seats", require("./routes/seat.routes"));
app.use("/api/dashboard", require("./routes/dashboard.routes"));
app.use("/api/student", require("./routes/student-me.routes"));
app.use("/api/student", require("./routes/renew-request.student.routes"));
app.use("/api/library", require("./routes/renew-request.library.routes"));
app.use("/api/admin", require("./routes/adminAuth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/superadmin", require("./routes/superadmin.routes"));
app.use("/api/subscription", require("./routes/subscription.routes"));
app.use("/api/library", require("./routes/library.routes"));
app.use("/api/user", require("./routes/user.routes"));
app.use("/api/templates", require("./routes/template.routes"));
app.use("/api/spaces", require("./routes/space.routes"));
app.use("/api/shifts", require("./routes/shift.routes"));
app.use("/api/allocations", require("./routes/allocation.routes"));
app.use("/api/payment", require("./routes/payment.routes"));
app.use("/api", require("./routes/checkoutStandard.routes"));
app.use("/api/plans", require("./routes/plans.routes"));
app.use("/api/settings", require("./routes/settings.routes"));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
