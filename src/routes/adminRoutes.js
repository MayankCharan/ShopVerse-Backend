const express = require("express");
const router = express.Router();
const {
  isAuthenticated,
  authorizeRoles,
} = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

router.get(
  "/dashboard-stats",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.getDashboardStats,
);
router.get(
  "/products",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.getAllProducts,
);
router.post(
  "/product/new",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.createProduct,
);
router.delete(
  "/product/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.deleteProduct,
);
router.get(
  "/orders",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.getAllOrders,
);
router.put(
  "/order/:id/status",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.updateOrderStatus,
);
router.get(
  "/users",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.getAllUsers,
);
router.put(
  "/user/:id/role",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.updateUserRole,
);
router.put(
  "/user/:id/seller-status",
  isAuthenticated,
  authorizeRoles("admin"),
  adminController.updateSellerRequest,
);

module.exports = router;
