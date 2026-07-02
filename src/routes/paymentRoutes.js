const express = require("express");
const router = express.Router();
const {
  createCheckoutSession,
  createOrderAfterPayment,
  handleStripeWebhook,
} = require("../controllers/paymentController");
const { isAuthenticated, isVerified } = require("../middleware/authMiddleware");
const { paymentLimiter } = require("../middleware/rateLimiter");

// Webhook endpoint - NO auth (Stripe calls this directly)
// Must handle raw body for signature verification
router.post(
  "/payment/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

// Protected payment routes
router.post(
  "/payment/create-session",
  isAuthenticated,
  isVerified,
  paymentLimiter,
  createCheckoutSession,
);

router.post(
  "/payment/create-order",
  isAuthenticated,
  isVerified,
  paymentLimiter,
  createOrderAfterPayment,
);

module.exports = router;
