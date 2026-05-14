const express = require("express");
const mongoose = require("mongoose");
const Student = require("../models/Student");
const Library = require("../models/Library");
const Attendance = require("../models/Attendance");
const Notification = require("../models/Notification");
const {
  formatNotificationForClient,
} = require("../services/notification.service");
const Seat = require("../models/Seat");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");
const { uploadBuffer, isCloudinaryConfigured } = require("../utils/cloudinary");
const otpService = require("../services/otp.service");
const { normalizeIndianMobile } = require("../utils/mobile");

const router = express.Router();

function getRequestMeta(req) {
  return {
    ip: String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"),
    userAgent: String(req.headers["user-agent"] || ""),
  };
}

function otpExpiryMinutes() {
  return Number.parseInt(process.env.MSG91_OTP_EXPIRY_MINUTES || "5", 10) || 5;
}

function toDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getUtcDayRange(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

function getUtcMonthRange(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function feeStatusToLegacy(feeStatus) {
  const s = String(feeStatus || "").trim().toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "partial") return "Half Paid";
  if (s === "pending") return "Pending";
  return "Pending";
}

function toStudentResponse(student, library) {
  return {
    id: student._id.toString(),
    role: "student",
    libraryId: student.libraryId?.toString?.() || null,
    library: library
      ? {
          id: library._id?.toString?.() || null,
          libraryName: library.name || "",
          logoUrl: library.logoUrl || null,
        }
      : null,
    name: student.name,
    mobile: student.mobile,
    isMobileVerified: Boolean(student.isMobileVerified),
    username: student.username,
    joinDate: student.joinDate?.toISOString?.() || null,
    expiryDate: student.expiryDate?.toISOString?.() || null,
    feeStatus: feeStatusToLegacy(student.feeStatus),
    feeAmount: student.feeAmount,
    isBlocked: Boolean(student.isBlocked),
    photoUrl: student.photoUrl || null,
  };
}

/**
 * GET /api/student/me
 *
 * Student dashboard API (token-scoped).
 * - Multi-tenant security enforced: { libraryId, userId } must match the student record
 * - Never returns PIN / hashes
 */
router.get("/me", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }

    // Multi-tenant security enforced
    const student = await Student.findOne({ _id: userId, libraryId, isDeleted: false }).lean();
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.isBlocked) return res.status(403).json({ message: "Account is blocked" });

    const todayKey = toDateKey(new Date());
    const today = new Date();
    const ym = toDateKey(today).slice(0, 7); // YYYY-MM
    const todayRange = getUtcDayRange(today);
    const monthRange = getUtcMonthRange(today.getUTCFullYear(), today.getUTCMonth() + 1);

    const [library, todayAttendance, monthAttendanceCount, recentNotifications, seat] = await Promise.all([
      Library.findById(libraryId).select("name logoUrl").lean(),
      Attendance.findOne({
        libraryId,
        studentId: userId,
        attendanceDate: { $gte: todayRange.start, $lt: todayRange.end },
      }).lean(),
      Attendance.countDocuments({
        libraryId,
        studentId: userId,
        attendanceDate: { $gte: monthRange.start, $lt: monthRange.end },
      }),
      Notification.find({
        libraryId,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        $or: [
          { targetType: "all" },
          { targetType: "student", targetId: userId },
          { targetType: "student", targetId: new mongoose.Types.ObjectId(userId) },
        ],
      })
        .sort({ date: -1 })
        .limit(20)
        .lean(),
      Seat.findOne({ libraryId, studentId: userId, status: "occupied" }).lean(),
    ]);

    return res.json({
      ok: true,
      student: toStudentResponse(student, library),
      seat: seat ? { id: seat._id.toString(), number: seat.number } : null,
      attendance: {
        date: todayKey,
        markedToday: Boolean(todayAttendance),
        month: ym,
        monthCount: Number(monthAttendanceCount) || 0,
      },
      notifications: recentNotifications.map((n) =>
        formatNotificationForClient(n, userId)
      ),
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load student dashboard", error: error.message });
  }
});

/**
 * POST /api/student/me/send-mobile-verify-otp
 *
 * Sends MSG91 OTP to the student's registered mobile (token-scoped).
 */
router.post("/me/send-mobile-verify-otp", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }
    const student = await Student.findOne({ _id: userId, libraryId, isDeleted: false });
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.isBlocked) return res.status(403).json({ message: "Account is blocked" });
    if (student.isMobileVerified) {
      return res.status(400).json({ message: "This mobile number is already verified." });
    }
    const mobile10 = normalizeIndianMobile(student.mobile);
    if (!mobile10) {
      return res.status(400).json({ message: "No valid 10-digit Indian mobile on this account." });
    }
    otpService.assertMsg91Configured();
    otpService.assertNotOtpBlocked(student);
    const mobileKey = `student_profile_verify:${userId}`;
    const meta = getRequestMeta(req);
    await otpService.enforceSendPolicies({ mobileKey, ip: meta.ip });
    await otpService.dispatchMsg91Otp(mobile10);
    await otpService.logSend({ mobileKey, purpose: "student_profile_verify", ip: meta.ip });
    return res.json({
      ok: true,
      message: "OTP sent successfully",
      resendAfterSeconds: Math.ceil(otpService.RESEND_COOLDOWN_MS / 1000),
      otpExpiresInMinutes: otpExpiryMinutes(),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message: error.message || "Request failed",
        ...(error.data && typeof error.data === "object" ? error.data : {}),
      });
    }
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
});

/**
 * POST /api/student/me/verify-mobile-otp
 * Body: { otp }
 */
router.post("/me/verify-mobile-otp", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }
    const otp = String(req.body?.otp || "").trim().replace(/\D/g, "");
    if (!/^\d{4,8}$/.test(otp)) {
      return res.status(400).json({ message: "Invalid OTP format" });
    }
    const student = await Student.findOne({ _id: userId, libraryId, isDeleted: false });
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.isBlocked) return res.status(403).json({ message: "Account is blocked" });
    if (student.isMobileVerified) {
      const library = await Library.findById(libraryId).select("name logoUrl").lean();
      return res.json({
        ok: true,
        alreadyVerified: true,
        student: toStudentResponse(student, library),
        message: "Mobile already verified",
      });
    }
    const mobile10 = normalizeIndianMobile(student.mobile);
    if (!mobile10) {
      return res.status(400).json({ message: "No valid 10-digit Indian mobile on this account." });
    }
    otpService.assertMsg91Configured();
    otpService.assertNotOtpBlocked(student);
    const ok = await otpService.verifyMsg91Otp(mobile10, otp);
    if (!ok) {
      await otpService.recordVerifyFailure(Student, student._id);
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    await otpService.resetOtpGateOnSuccess(Student, student._id);
    const fresh = await Student.findOne({ _id: userId, libraryId, isDeleted: false }).lean();
    const library = await Library.findById(libraryId).select("name logoUrl").lean();
    return res.json({ ok: true, student: toStudentResponse(fresh, library), message: "Mobile verified" });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 400 && status < 500) {
      return res.status(status).json({
        message: error.message || "Request failed",
        ...(error.data && typeof error.data === "object" ? error.data : {}),
      });
    }
    return res.status(500).json({ message: "Failed to verify OTP", error: error.message });
  }
});

/**
 * POST /api/student/me/photo
 *
 * Student self-service profile photo update (token-scoped).
 * - Uses Cloudinary (same as library upload flow)
 */
router.post("/me/photo", requireAuth, requireRole("student"), upload.single("photo"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }
    if (!req.file) return res.status(400).json({ message: "No image file provided" });
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({ message: "Cloudinary is not configured on the server" });
    }

    // Multi-tenant security enforced
    const student = await Student.findOne({ _id: userId, libraryId, isDeleted: false });
    if (!student) return res.status(404).json({ message: "Student not found" });
    if (student.isBlocked) return res.status(403).json({ message: "Account is blocked" });

    const { url } = await uploadBuffer(req.file.buffer, {
      public_id: `student_${student._id}`,
      overwrite: true,
    });

    student.photoUrl = url;
    await student.save();

    const library = await Library.findById(libraryId).select("name logoUrl").lean();
    return res.json({ ok: true, student: toStudentResponse(student, library) });
  } catch (error) {
    return res.status(500).json({ message: "Photo upload failed", error: error.message });
  }
});

/**
 * DELETE /api/student/me
 *
 * Student self-service delete account (soft delete).
 * - Marks student isDeleted=true
 * - Unassigns any occupied seat
 */
router.delete("/me", requireAuth, requireRole("student"), async (req, res) => {
  try {
    const userId = String(req.user?.userId || "").trim();
    const libraryId = String(req.user?.libraryId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(libraryId)) {
      return res.status(400).json({ message: "Invalid auth payload" });
    }

    // Multi-tenant security enforced
    const student = await Student.findOne({ _id: userId, libraryId, isDeleted: false });
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.isDeleted = true;
    await student.save();

    await Seat.findOneAndUpdate(
      { libraryId, studentId: userId, status: "occupied" },
      { status: "available", studentId: null }
    );

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete account", error: error.message });
  }
});

module.exports = router;

