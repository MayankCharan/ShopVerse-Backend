const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductDetails,
  getCategories,
  createReview,
} = require("../controllers/productController");
const { isAuthenticated } = require("../middleware/authMiddleware");
const { reviewLimiter, generalLimiter } = require("../middleware/rateLimiter");

// Public routes
router.get("/products", generalLimiter, getAllProducts);
router.get("/product/:id", generalLimiter, getProductDetails);
router.get("/categories", generalLimiter, getCategories);

// Protected routes
router.put("/product/:id/review", isAuthenticated, reviewLimiter, createReview);

module.exports = router;
