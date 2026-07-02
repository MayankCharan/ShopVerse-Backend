const express = require("express");
const router = express.Router();
const {
  sendSignupOtp,
  verifyOtpAndSignup,
  loginUser,
  logoutUser,
  getUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  updateProfile,
  updatePassword,
  requestSellerAccount, // <-- MAKE SURE THIS IS HERE
} = require("../controllers/authController");
const { isAuthenticated } = require("../middleware/authMiddleware");

// Public routes
router.post("/signup/otp", sendSignupOtp);
router.post("/signup/verify", verifyOtpAndSignup);
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.post("/password/forgot", forgotPassword);
router.post("/password/verify-otp", verifyResetOtp);
router.post("/password/reset", resetPassword);
router.post("/request-seller", isAuthenticated, requestSellerAccount); // <-- AND THIS

// Protected routes
router.get("/me", isAuthenticated, getUser);
router.put("/profile/update", isAuthenticated, updateProfile);
router.put("/password/update", isAuthenticated, updatePassword);

module.exports = router;
