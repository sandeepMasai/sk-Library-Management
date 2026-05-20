/**
 * Razorpay Standard Checkout aliases (documentation paths).
 * Subscription flow continues to use POST /api/payment/create-order and POST /api/payment/verify.
 */
const express = require("express");
const crypto = require("crypto");
const { requireAuth } = require("../middleware/auth.middleware");
const { requireRole } = require("../middleware/role.middleware");
const {
  getRazorpayClient,
  logRazorpayError,
  maskKeyId,
  parseRazorpayError,
} = require("../utils/razorpayClient");

const router = express.Router();

/**
 * POST /api/create-order
 * Body: { amount (paise, min 100), currency?, receipt? }
 * Returns: { order_id, orderId, keyId, amount, currency }
 */
router.post("/create-order", requireAuth, requireRole("library"), async (req, res) => {
  try {
    const amountPaise = Math.round(Number(req.body?.amount) || 0);
    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return res.status(400).json({ message: "amount must be at least 100 paise", code: "INVALID_AMOUNT" });
    }

    const currency = String(req.body?.currency || "INR").trim().toUpperCase() || "INR";
    const receipt = String(req.body?.receipt || `std_${Date.now()}`).slice(0, 40);

    const { keyId, mode, client } = getRazorpayClient();
    const order = await client.orders.create({
      amount: amountPaise,
      currency,
      receipt,
      notes: { libraryId: String(req.user?.libraryId || ""), source: "standard_checkout" },
    });

    return res.json({
      ok: true,
      order_id: order.id,
      orderId: order.id,
      keyId,
      amount: Number(order.amount),
      currency: order.currency,
      mode,
    });
  } catch (error) {
    logRazorpayError(error, { action: "standard-create-order" });
    const { rpCode, message, authFailed } = parseRazorpayError(error);
    if (authFailed) {
      return res.status(401).json({
        message: "Razorpay authentication failed — check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
        code: "RAZORPAY_AUTH_FAILED",
        keyId: maskKeyId(process.env.RAZORPAY_KEY_ID),
      });
    }
    return res.status(error.statusCode || 500).json({ message, code: rpCode });
  }
});

/**
 * POST /api/verify-payment
 * Body: orderId|razorpay_order_id, paymentId|razorpay_payment_id, signature|razorpay_signature
 */
router.post("/verify-payment", requireAuth, requireRole("library"), async (req, res) => {
  try {
    const orderId = String(req.body?.orderId || req.body?.razorpay_order_id || "").trim();
    const paymentId = String(req.body?.paymentId || req.body?.razorpay_payment_id || "").trim();
    const signature = String(req.body?.signature || req.body?.razorpay_signature || "").trim();

    if (!orderId || !paymentId || !signature) {
      return res.status(400).json({ message: "Missing orderId, paymentId, or signature", code: "MISSING_FIELDS" });
    }

    const { keySecret } = getRazorpayClient();
    const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");

    if (expected !== signature) {
      return res.status(400).json({
        message: "Payment verification failed — signature mismatch",
        code: "VERIFY_FAILED",
      });
    }

    return res.json({ ok: true, success: true, message: "Payment verified" });
  } catch (error) {
    return res.status(500).json({ message: error.message || "Verification failed" });
  }
});

module.exports = router;
