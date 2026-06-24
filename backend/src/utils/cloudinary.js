const cloudinary = require("cloudinary").v2;
const logger = require("./logger");

// Cloudinary SDK auto-reads CLOUDINARY_URL from env if set.
// Format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
// Or set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
if (!process.env.CLOUDINARY_URL && process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

const DEFAULT_IMAGE_TRANSFORMATION = [
  { width: 400, height: 400, crop: "fill", gravity: "face" },
];

function buildUploadOptions(options = {}) {
  const resourceType = String(options.resource_type || "image").toLowerCase();
  const folder = options.folder || "libdesk/uploads";

  const uploadOptions = {
    folder,
    resource_type: resourceType,
    // New Cloudinary accounts default to async uploads (status: "pending", no secure_url).
    // We need the delivery URL immediately to save logoUrl / imageUrl in MongoDB.
    async: options.async ?? false,
    ...options,
    folder,
    resource_type: resourceType,
    async: options.async ?? false,
  };

  // Image transforms break raw/video uploads — only apply for images.
  if (resourceType === "image" && !uploadOptions.transformation) {
    uploadOptions.transformation = DEFAULT_IMAGE_TRANSFORMATION;
  }
  if (resourceType !== "image") {
    delete uploadOptions.transformation;
  }

  return uploadOptions;
}

/**
 * Upload a buffer to Cloudinary and return the secure URL.
 * @param {Buffer} buffer
 * @param {object} options  - Cloudinary upload options (folder, resource_type, transformation, public_id, …)
 * @returns {Promise<{url: string, public_id: string, resource_type: string, bytes: number}>}
 */
async function uploadBuffer(buffer, options = {}) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Upload buffer is empty");
  }

  const uploadOptions = buildUploadOptions(options);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error("Cloudinary upload failed", {
          message: error.message,
          http_code: error.http_code,
          folder: uploadOptions.folder,
          resource_type: uploadOptions.resource_type,
          public_id: uploadOptions.public_id || null,
        });
        return reject(error);
      }

      if (!result?.secure_url) {
        const pending = result?.status === "pending";
        logger.error("Cloudinary upload missing secure_url", {
          public_id: result?.public_id,
          status: result?.status,
          batch_id: result?.batch_id,
          pending,
        });
        return reject(
          new Error(
            pending
              ? "Cloudinary returned async pending upload — set async:false or check account upload settings"
              : "Cloudinary upload succeeded but no delivery URL was returned"
          )
        );
      }

      logger.info("Cloudinary upload ok", {
        public_id: result.public_id,
        resource_type: result.resource_type,
        bytes: result.bytes,
        folder: uploadOptions.folder,
        secure_url: result.secure_url,
      });

      resolve({
        url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
        bytes: result.bytes,
      });
    });
    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public_id.
 * @param {string} publicId
 * @param {{ resource_type?: string }} opts
 */
async function deleteAsset(publicId, opts = {}) {
  const resourceType = String(opts.resource_type || "image").toLowerCase();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    logger.warn("Cloudinary delete failed", {
      publicId,
      resource_type: resourceType,
      message: error?.message,
    });
  }
}

function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
    return true;
  }
  const cfg = cloudinary.config();
  return Boolean(cfg.cloud_name && cfg.api_key && cfg.api_secret);
}

function getCloudinaryStatus() {
  const cfg = cloudinary.config();
  return {
    configured: isCloudinaryConfigured(),
    cloud_name: cfg.cloud_name || null,
    has_api_key: Boolean(cfg.api_key),
    has_api_secret: Boolean(cfg.api_secret),
    source: process.env.CLOUDINARY_URL
      ? "CLOUDINARY_URL"
      : process.env.CLOUDINARY_CLOUD_NAME
        ? "CLOUDINARY_CLOUD_NAME"
        : cfg.cloud_name
          ? "sdk"
          : "none",
  };
}

/**
 * Parse a Cloudinary delivery URL into resource metadata.
 */
function parseCloudinaryDeliveryUrl(url) {
  const raw = String(url || "").trim();
  const match = raw.match(
    /res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:s--[^/]+--\/)?(?:v\d+\/)?(.+)$/i
  );
  if (!match) return null;

  const resourceType = match[1].toLowerCase();
  let publicId = decodeURIComponent(match[2]);
  if (publicId.includes("?")) {
    publicId = publicId.split("?")[0];
  }

  const formatMatch = /\.([a-z0-9]+)$/i.exec(publicId);
  const format = formatMatch?.[1]?.toLowerCase() || null;

  return { resourceType, publicId, format };
}

function isCloudinaryDocumentUrl(url) {
  const raw = String(url || "").trim();
  if (!raw.includes("res.cloudinary.com")) return false;
  return /\.pdf($|\?)/i.test(raw) || /\/raw\/upload\//i.test(raw);
}

/**
 * Build a time-limited signed download URL for PDFs/docs.
 * Required when Cloudinary blocks anonymous PDF delivery (HTTP 401 on res.cloudinary.com).
 */
function getSignedDocumentDownloadUrl(storedUrl, { ttlSeconds = 3600 } = {}) {
  const raw = String(storedUrl || "").trim();
  if (!raw || !isCloudinaryConfigured()) return raw;
  if (!isCloudinaryDocumentUrl(raw)) return raw;

  const parsed = parseCloudinaryDeliveryUrl(raw);
  if (!parsed) return raw;

  const format = parsed.format === "pdf" ? "pdf" : parsed.format || "pdf";
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, ttlSeconds);

  try {
    return cloudinary.utils.private_download_url(parsed.publicId, format, {
      resource_type: parsed.resourceType,
      type: "upload",
      expires_at: expiresAt,
    });
  } catch (error) {
    logger.warn("Cloudinary signed document URL failed", {
      message: error?.message,
      publicId: parsed.publicId,
    });
    return raw;
  }
}

/**
 * Ping Cloudinary API (call once on server boot).
 */
async function verifyCloudinaryConnection() {
  const status = getCloudinaryStatus();
  if (!status.configured) {
    return { ok: false, reason: "not_configured", status };
  }
  try {
    await cloudinary.api.ping();
    return { ok: true, status };
  } catch (error) {
    return {
      ok: false,
      reason: "ping_failed",
      message: error?.message,
      http_code: error?.http_code,
      status,
    };
  }
}

module.exports = {
  uploadBuffer,
  deleteAsset,
  isCloudinaryConfigured,
  getCloudinaryStatus,
  verifyCloudinaryConnection,
  parseCloudinaryDeliveryUrl,
  isCloudinaryDocumentUrl,
  getSignedDocumentDownloadUrl,
};
