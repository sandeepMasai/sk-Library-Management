const express = require("express");
const { requireRole } = require("../middleware/role.middleware");
const { requireAuth } = require("../middleware/auth.middleware");
const settingsController = require("../controllers/settings.controller");

const router = express.Router();

// Read-only settings needed by all app roles (and safe to expose).
router.get("/", settingsController.publicGetSettings);
router.put("/", requireAuth, requireRole("admin"), settingsController.updateSettings);

module.exports = router;
