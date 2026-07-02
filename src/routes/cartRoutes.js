const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require("../controllers/cartController");
const { isAuthenticated, isVerified } = require("../middleware/authMiddleware");
const { generalLimiter } = require("../middleware/rateLimiter");

// All cart routes require authentication and verification
router.use(isAuthenticated, isVerified);

router.get("/cart", generalLimiter, getCart);
router.post("/cart", generalLimiter, addToCart);
router.put("/cart", generalLimiter, updateCartItem);
router.delete("/cart/:productId", generalLimiter, removeCartItem);
router.delete("/cart", generalLimiter, clearCart);

module.exports = router;
