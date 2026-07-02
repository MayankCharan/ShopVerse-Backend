const express = require("express");
const router = express.Router();
const {
  isAuthenticated,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const sellerController = require("../controllers/adminController");

router.get(
  "/dashboard-stats",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.getDashboardStats,
);
router.get(
  "/products",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.getAllProducts,
);
router.post(
  "/product/new",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.createProduct,
);
router.delete(
  "/product/:id",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.deleteProduct,
);
router.get(
  "/orders",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.getSellerOrders,
);
router.put(
  "/order/:id/status",
  isAuthenticated,
  authorizeRoles("seller"),
  sellerController.updateOrderStatus,
);

module.exports = router;
