const express = require("express");
const rateLimit = require("express-rate-limit");
const { sanitizeBody } = require("../middleware/validate.middleware");
const publicController = require("../controllers/public.controller");

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: "Too many contact requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/contact",
  contactLimiter,
  sanitizeBody(["name", "email", "phone", "message"], { maxLength: 5000 }),
  publicController.submitContact
);

module.exports = router;
