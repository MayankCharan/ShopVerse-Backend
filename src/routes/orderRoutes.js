const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderDetails,
} = require("../controllers/orderController");
const { isAuthenticated, isVerified } = require("../middleware/authMiddleware");
const { generalLimiter } = require("../middleware/rateLimiter");

router.use(isAuthenticated);

router.post("/order/new", isVerified, generalLimiter, createOrder);
router.get("/orders/me", generalLimiter, getMyOrders);
router.get("/order/:id", generalLimiter, getOrderDetails);

module.exports = router;
