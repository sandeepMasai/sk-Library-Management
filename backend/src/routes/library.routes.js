const express = require("express");
const Library = require("../models/Library");
const Seat = require("../models/Seat");
const upload = require("../middleware/upload.middleware");
const { uploadBuffer, isCloudinaryConfigured } = require("../utils/cloudinary");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const { normalizeIndianMobile, normalizeIndianMobileOptional, hasNonIndiaPlusPrefix } = require("../utils/mobile");
const { toLibraryProfile } = require("./library.serialize");
const { toLibraryContactDto } = require("../utils/libraryContact");
const {
  sendLibraryVerificationEmail,
  verifyLibraryEmail,
} = require("../controllers/emailOtp.controller");

const router = express.Router();

/**
 * PATCH /api/library/attendance-settings
 * Toggle: allow attendance only for active paid members.
 */
router.patch("/attendance-settings", requireAuth, requireRole("library"), async (req, res) => {
  try {
    const id = req.user?.libraryId;
    if (!id) return res.status(400).json({ message: "libraryId missing" });
    if (req.body?.attendanceActiveMembersOnly === undefined) {
      return res.status(400).json({ message: "attendanceActiveMembersOnly is required" });
    }
    const lib = await Library.findByIdAndUpdate(
      id,
      { $set: { attendanceActiveMembersOnly: Boolean(req.body.attendanceActiveMembersOnly) } },
      { new: true, runValidators: true }
    ).lean();
    if (!lib) return res.status(404).json({ message: "Library not found" });
    return res.json({
      ok: true,
      attendanceActiveMembersOnly: lib.attendanceActiveMembersOnly !== false,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update attendance settings", error: error.message });
  }
});

/**
 * GET /api/library/profile
 *
 * Returns profile data for:
 * - library role: full profile
 * - student role: ONLY library communication (no global merge)
 */
router.get("/profile", requireAuth, requireRole("library", "student"), async (req, res) => {
  try {
    let id = req.user?.libraryId;
    if (!id) return res.status(400).json({ message: "libraryId missing" });

    if (req.user?.role === "student") {
      const userId = String(req.user.userId || "").trim();
      const Student = require("../models/Student");
      const student = await Student.findOne({ _id: userId, isDeleted: false }).select("libraryId").lean();
      if (!student?.libraryId) {
        return res.status(404).json({ message: "Student not found" });
      }
      id = student.libraryId;
    }

    const libPromise = Library.findById(id).lean();
    const seatCountPromise =
      req.user?.role === "library"
        ? Seat.countDocuments({ libraryId: id })
        : Promise.resolve(0);

    const [lib, totalSeats] = await Promise.all([libPromise, seatCountPromise]);
    if (!lib) return res.status(404).json({ message: "Library not found" });
    if (req.user?.role === "student") {
      return res.json({ ok: true, profile: toLibraryContactDto(lib) });
    }
    return res.json({ ok: true, profile: toLibraryProfile(lib, { totalSeats }) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to load profile", error: error.message });
  }
});

/**
 * PUT /api/library/profile
 *
 * Updates profile fields (no password changes here).
 */
router.put("/profile", requireAuth, requireRole("library"), async (req, res) => {
  try {
    const id = req.user?.libraryId;
    const existingLib = await Library.findById(id).select("phone").lean();
    if (!existingLib) return res.status(404).json({ message: "Library not found" });

    const ownerName = String(req.body?.name || "").trim();
    const phoneTrim = String(req.body?.phone ?? "").trim();
    let phoneValue = null;
    if (phoneTrim) {
      const mobile10 = normalizeIndianMobile(phoneTrim);
      if (!mobile10) {
        const nonIndia = hasNonIndiaPlusPrefix(phoneTrim);
        return res.status(400).json({
          message: nonIndia
            ? "Only Indian (+91) mobile numbers are supported."
            : "Invalid phone number (10-digit Indian mobile required)",
          code: nonIndia ? "UNSUPPORTED_COUNTRY" : "INVALID_INDIAN_MOBILE",
        });
      }
      phoneValue = mobile10;
    }
    const prev10 = normalizeIndianMobileOptional(existingLib.phone);
    const phoneChanged = (prev10 || "") !== (phoneValue || "");
    const rawWhatsapp = req.body?.whatsappNumber === undefined ? undefined : String(req.body.whatsappNumber || "").trim();
    const rawCommunity = req.body?.communityLinks;
    const rawCommunication = req.body?.communication;
    const libraryName = String(req.body?.libraryName || "").trim();
    const address = String(req.body?.address || "").trim();
    const city = String(req.body?.city || "").trim();
    const rawState = req.body?.state === undefined ? undefined : String(req.body.state || "").trim();
    const rawPlace = req.body?.place === undefined ? undefined : String(req.body.place || "").trim();
    const rawPincode =
      req.body?.pincode === undefined ? undefined : String(req.body.pincode || "").replace(/\D/g, "").slice(0, 6);

    if (!ownerName || !libraryName || !city) {
      return res.status(400).json({ message: "name, libraryName, city are required" });
    }

    if (rawPincode !== undefined && rawPincode !== "" && !/^\d{6}$/.test(rawPincode)) {
      return res.status(400).json({ message: "pincode must be exactly 6 digits" });
    }

    let whatsappNumber = undefined;
    if (rawWhatsapp !== undefined) {
      const digits = rawWhatsapp.replace(/\D/g, "");
      if (!digits) {
        whatsappNumber = null;
      } else {
        const normalized = digits.length === 10 ? `91${digits}` : digits; // default India if missing country code
        if (!/^\d{10,15}$/.test(normalized)) {
          return res.status(400).json({ message: "Invalid whatsappNumber (10–15 digits, include country code)" });
        }
        whatsappNumber = normalized;
      }
    }

    function isValidHttpUrl(input) {
      try {
        const u = new URL(String(input || "").trim());
        return u.protocol === "http:" || u.protocol === "https:";
      } catch {
        return false;
      }
    }

    let communication = undefined;
    if (rawCommunication !== undefined) {
      const w = rawCommunication?.whatsapp === undefined ? undefined : String(rawCommunication.whatsapp || "").trim();
      const c = rawCommunication?.channel === undefined ? undefined : String(rawCommunication.channel || "").trim();
      const e = rawCommunication?.email === undefined ? undefined : String(rawCommunication.email || "").trim();

      const norm = (v) => (v ? v : null);

      let commWhatsapp = undefined;
      if (w !== undefined) {
        const digits = w.replace(/\D/g, "");
        if (!digits) commWhatsapp = null;
        else if (!/^\d{10,15}$/.test(digits)) return res.status(400).json({ message: "Invalid communication.whatsapp (10–15 digits)" });
        else commWhatsapp = digits;
      }

      let commChannel = undefined;
      if (c !== undefined) {
        if (!c) commChannel = null;
        else if (!isValidHttpUrl(c)) return res.status(400).json({ message: "Invalid communication.channel" });
        else commChannel = c;
      }

      let commEmail = undefined;
      if (e !== undefined) {
        const email = e.trim().toLowerCase();
        if (!email) commEmail = null;
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Invalid communication.email" });
        else commEmail = email;
      }

      communication = {
        ...(w !== undefined ? { whatsapp: commWhatsapp } : {}),
        ...(c !== undefined ? { channel: commChannel } : {}),
        ...(e !== undefined ? { email: commEmail } : {}),
      };
    }

    let communityLinks = undefined;
    if (rawCommunity !== undefined) {
      const wg = rawCommunity?.whatsappGroup === undefined ? undefined : String(rawCommunity.whatsappGroup || "").trim();
      const wc = rawCommunity?.whatsappChannel === undefined ? undefined : String(rawCommunity.whatsappChannel || "").trim();
      const tg = rawCommunity?.telegram === undefined ? undefined : String(rawCommunity.telegram || "").trim();

      const norm = (v) => (v ? v : null);
      if (wg && !isValidHttpUrl(wg)) return res.status(400).json({ message: "Invalid communityLinks.whatsappGroup" });
      if (wc && !isValidHttpUrl(wc)) return res.status(400).json({ message: "Invalid communityLinks.whatsappChannel" });
      if (tg && !isValidHttpUrl(tg)) return res.status(400).json({ message: "Invalid communityLinks.telegram" });

      communityLinks = {
        whatsappGroup: norm(wg),
        whatsappChannel: norm(wc),
        telegram: norm(tg),
      };
    }

    const updated = await Library.findByIdAndUpdate(
      id,
      {
        $set: {
          ownerName,
          phone: phoneValue,
          // DEPRECATED: Mobile OTP verification removed - no longer reset on phone change
          // ...(phoneChanged ? { isMobileVerified: false } : {}),
          name: libraryName,
          address: address || null,
          city,
          ...(rawState !== undefined ? { state: rawState } : {}),
          ...(rawPlace !== undefined ? { place: rawPlace } : {}),
          ...(rawPincode !== undefined ? { pincode: rawPincode } : {}),
          ...(rawWhatsapp !== undefined ? { whatsappNumber } : {}),
          ...(rawCommunity !== undefined ? { communityLinks } : {}),
          ...(rawCommunication !== undefined ? { communication } : {}),
        },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ message: "Library not found" });
    return res.json({ ok: true, profile: toLibraryProfile(updated) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
});

/**
 * POST /api/library/logo
 *
 * Uploads a new logo and updates Library.logoUrl.
 */
router.post("/logo", requireAuth, requireRole("library"), upload.single("logo"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ message: "logo is required" });
    if (!isCloudinaryConfigured()) return res.status(500).json({ message: "Cloudinary is not configured" });

    const id = req.user?.libraryId;
    if (!id) return res.status(400).json({ message: "libraryId missing" });

    const { url } = await uploadBuffer(req.file.buffer, {
      folder: "libdesk/library-logos",
      public_id: `library_${id}`,
      overwrite: true,
      transformation: [{ width: 512, height: 512, crop: "fill", gravity: "center" }],
    });
    if (!url) {
      return res.status(500).json({ message: "Logo uploaded but Cloudinary did not return a URL" });
    }

    const updated = await Library.findByIdAndUpdate(
      id,
      { $set: { logoUrl: url } },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Library not found" });

    return res.json({ ok: true, logoUrl: url, profile: toLibraryProfile(updated) });
  } catch (error) {
    return res.status(500).json({ message: "Failed to upload logo", error: error.message });
  }
});

/**
 * POST /api/library/send-verification-email
 *
 * Send email OTP for library email verification
 */
router.post("/send-verification-email", requireAuth, requireRole("library"), async (req, res, next) => {
  try {
    const library = await Library.findById(req.user?.libraryId);
    if (!library) return res.status(404).json({ message: "Library not found" });
    req.library = library;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to load library", error: error.message });
  }
}, sendLibraryVerificationEmail);

/**
 * POST /api/library/verify-email
 *
 * Verify email OTP for library
 */
router.post("/verify-email", requireAuth, requireRole("library"), async (req, res, next) => {
  try {
    const library = await Library.findById(req.user?.libraryId);
    if (!library) return res.status(404).json({ message: "Library not found" });
    req.library = library;
    next();
  } catch (error) {
    return res.status(500).json({ message: "Failed to load library", error: error.message });
  }
}, verifyLibraryEmail);

module.exports = router;

