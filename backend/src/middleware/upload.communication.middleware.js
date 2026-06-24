const path = require("path");
const multer = require("multer");
const { createHttpError } = require("../utils/httpError");

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PDF_MIME_TYPES = new Set([
  "application/pdf",
  "application/x-pdf",
  "application/acrobat",
  "applications/vnd.pdf",
  "text/pdf",
  "text/x-pdf",
]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

function getExtension(filename) {
  return path.extname(String(filename || "")).toLowerCase();
}

function isPdfFile(file) {
  const mime = String(file?.mimetype || "").toLowerCase();
  const ext = getExtension(file?.originalname);
  if (PDF_MIME_TYPES.has(mime)) return true;
  if (PDF_EXTENSIONS.has(ext)) return true;
  return false;
}

function isImageFile(file) {
  const mime = String(file?.mimetype || "").toLowerCase();
  const ext = getExtension(file?.originalname);
  if (IMAGE_MIME_TYPES.has(mime)) return true;
  if (IMAGE_EXTENSIONS.has(ext) && mime.startsWith("image/")) return true;
  if (IMAGE_EXTENSIONS.has(ext) && (mime === "application/octet-stream" || mime === "")) return true;
  return false;
}

function validateCommunicationFile(file) {
  if (!file) return false;
  return isPdfFile(file) || isImageFile(file);
}

const uploadCommunication = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    try {
      if (validateCommunicationFile(file)) return cb(null, true);
      cb(
        createHttpError(400, "Only JPEG, PNG, WebP images or PDF files are allowed"),
        false
      );
    } catch (error) {
      cb(error, false);
    }
  },
});

module.exports = uploadCommunication;
module.exports.isPdfFile = isPdfFile;
module.exports.isImageFile = isImageFile;
