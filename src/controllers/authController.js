const User = require("../models/User");
const Otp = require("../models/Otp");
const TokenBlacklist = require("../models/TokenBlacklist");
const AuditLog = require("../models/AuditLog");
const sendEmail = require("../utils/sendEmail");
const generateOtp = require("../utils/generateOtp");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const logger = require("../utils/logger");
const { validate } = require("../utils/validate");
const {
  sendSignupOtpSchema,
  verifyOtpAndSignupSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetOtpSchema,
  resetPasswordSchema,
  updateProfileSchema,
  updatePasswordSchema,
} = require("../validators/authValidator");
const auditLog = require("../middleware/auditLogger");

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "15m",
    algorithm: "HS256",
    issuer: "shopverse-api",
    subject: userId.toString(),
  });
};

/**
 * Send token in HTTP-only cookie
 */
const sendToken = (user, statusCode, res, extraData = {}) => {
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() +
        (parseInt(process.env.COOKIE_EXPIRE) || 1) * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Secure only in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  };

  // Sanitize user object before sending
  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    mfaEnabled: user.mfaEnabled,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };

  res
    .status(statusCode)
    .cookie("token", token, options)
    .json({
      success: true,
      user: safeUser,
      ...extraData,
    });
};

/**
 * Create audit log entry
 */
const createAuditLog = async (data) => {
  try {
    await AuditLog.create(data);
  } catch (error) {
    logger.error("Failed to create audit log", { error: error.message });
  }
};

/**
 * Send signup OTP
 */
exports.sendSignupOtp = [
  validate(sendSignupOtpSchema),

  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already registered",
        });
      }

      // Delete any existing OTP for this email/purpose
      await Otp.deleteMany({ email, purpose: "verification" });

      const otp = generateOtp();

      // Store hashed OTP
      await Otp.create({
        email,
        otpHash: otp, // Will be hashed by pre-save hook
        purpose: "verification",
        ipAddress: req.ip,
      });

      const message = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">ShopVerse - Verify Your Email</h2>
          <p>Hello <strong>${escapeHtml(name)}</strong>,</p>
          <p>Your verification OTP is:</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
            ${otp}
          </div>
          <p>This OTP is valid for 5 minutes only.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">ShopVerse E-Commerce</p>
        </div>
      `;

      await sendEmail({
        email,
        subject: "ShopVerse - Email Verification OTP",
        message,
      });

      logger.info("Signup OTP sent", {
        email,
        ip: req.ip,
        requestId: req.requestId,
      });

      res.status(200).json({
        success: true,
        message: "OTP sent to your email",
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Verify OTP and complete signup
 */
exports.verifyOtpAndSignup = [
  validate(verifyOtpAndSignupSchema),

  async (req, res, next) => {
    try {
      const { name, email, password, otp } = req.body;

      // Find OTP record
      const otpRecord = await Otp.findOne({
        email,
        purpose: "verification",
        verified: false,
      });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: "No OTP found. Please request a new one.",
        });
      }

      // Verify OTP (with attempt tracking)
      const verification = await otpRecord.verifyOtp(otp);

      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message,
          attemptsRemaining: verification.attemptsRemaining,
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password,
        isVerified: true,
        emailVerifiedAt: new Date(),
      });

      // Delete used OTP
      await Otp.deleteMany({ email, purpose: "verification" });

      // Create audit log
      await createAuditLog({
        action: "USER_SIGNUP",
        userId: user._id,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        requestId: req.requestId,
      });

      // Update last login
      user.lastLogin = new Date();
      user.lastLoginIp = req.ip;
      await user.save({ validateBeforeSave: false });

      sendToken(user, 201, res);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Login user
 */
exports.loginUser = [
  validate(loginSchema),

  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select(
        "+password +loginAttempts +lockUntil",
      );

      if (!user) {
        // Log failed attempt (even for non-existent users to prevent enumeration)
        logger.warn("Login failed - user not found", {
          email,
          ip: req.ip,
          requestId: req.requestId,
        });
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        const lockTimeRemaining = Math.ceil(
          (user.lockUntil - Date.now()) / 60000,
        );
        logger.warn("Login attempt on locked account", {
          userId: user._id,
          ip: req.ip,
          lockTimeRemaining,
          requestId: req.requestId,
        });
        return res.status(423).json({
          success: false,
          message: `Account is locked. Try again in ${lockTimeRemaining} minutes.`,
          code: "ACCOUNT_LOCKED",
          lockTimeRemaining,
        });
      }

      // Check if account is suspended
      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Account has been suspended. Contact support.",
          code: "ACCOUNT_SUSPENDED",
        });
      }

      // Check password
      const isPasswordMatch = await user.comparePassword(password);

      if (!isPasswordMatch) {
        // Increment login attempts
        await user.incrementLoginAttempts();

        const attemptsLeft = 5 - (user.loginAttempts + 1);

        logger.warn("Login failed - wrong password", {
          userId: user._id,
          email,
          ip: req.ip,
          attemptsLeft,
          requestId: req.requestId,
        });

        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
          attemptsLeft: Math.max(0, attemptsLeft),
        });
      }

      // Check email verification
      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message: "Please verify your email first",
          code: "EMAIL_NOT_VERIFIED",
        });
      }

      // Reset login attempts on successful login
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      user.lastLoginIp = req.ip;
      await user.save({ validateBeforeSave: false });

      // Create audit log
      await createAuditLog({
        action: "USER_LOGIN",
        userId: user._id,
        userRole: user.role,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        requestId: req.requestId,
      });

      // Check if MFA is enabled
      if (user.mfaEnabled) {
        // Return user info but don't send full token yet
        const mfaToken = jwt.sign(
          { id: user._id, mfaPending: true },
          process.env.JWT_SECRET,
          { expiresIn: "5m", algorithm: "HS256" },
        );

        res.cookie("mfa_token", mfaToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 5 * 60 * 1000,
          path: "/",
        });

        return res.status(200).json({
          success: true,
          message: "MFA verification required",
          code: "MFA_REQUIRED",
          mfaEnabled: true,
        });
      }

      sendToken(user, 200, res);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Logout user
 */
exports.logoutUser = async (req, res, next) => {
  try {
    // Blacklist the token if it exists
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, {
          algorithms: ["HS256"],
        });
        await TokenBlacklist.create({
          token,
          userId: decoded.id,
          expiresAt: new Date(decoded.exp * 1000),
        });
      } catch (e) {
        // Token already invalid, continue with logout
      }
    }

    // Clear cookies
    res.cookie("token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    res.cookie("mfa_token", "", {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });

    // Create audit log
    if (req.user) {
      await createAuditLog({
        action: "USER_LOGOUT",
        userId: req.user._id,
        userRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        requestId: req.requestId,
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user
 */
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      "-password -passwordHistory -mfaSecret -mfaBackupCodes",
    );

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - send OTP
 */
exports.forgotPassword = [
  validate(forgotPasswordSchema),

  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });

      // Always return success to prevent email enumeration
      if (!user) {
        logger.warn("Password reset requested for non-existent email", {
          email,
          ip: req.ip,
          requestId: req.requestId,
        });
        return res.status(200).json({
          success: true,
          message:
            "If an account exists with this email, you will receive an OTP",
        });
      }

      // Delete existing OTP
      await Otp.deleteMany({ email, purpose: "resetPassword" });

      const otp = generateOtp();

      await Otp.create({
        email,
        otpHash: otp,
        purpose: "resetPassword",
        ipAddress: req.ip,
      });

      const message = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">ShopVerse - Reset Your Password</h2>
          <p>Hello <strong>${escapeHtml(user.name)}</strong>,</p>
          <p>Your password reset OTP is:</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">
            ${otp}
          </div>
          <p>This OTP is valid for 5 minutes only.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">ShopVerse E-Commerce</p>
        </div>
      `;

      await sendEmail({
        email: user.email,
        subject: "ShopVerse - Password Reset OTP",
        message,
      });

      logger.info("Password reset OTP sent", {
        userId: user._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      res.status(200).json({
        success: true,
        message:
          "If an account exists with this email, you will receive an OTP",
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Verify reset OTP
 */
exports.verifyResetOtp = [
  validate(verifyResetOtpSchema),

  async (req, res, next) => {
    try {
      const { email, otp } = req.body;

      const otpRecord = await Otp.findOne({
        email,
        purpose: "resetPassword",
        verified: false,
      });

      if (!otpRecord) {
        return res.status(400).json({
          success: false,
          message: "No OTP found. Please request a new one.",
        });
      }

      const verification = await otpRecord.verifyOtp(otp);

      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message,
          attemptsRemaining: verification.attemptsRemaining,
        });
      }

      // Generate secure reset token
      const user = await User.findOne({ email });
      const resetToken = user.getResetPasswordToken();
      await user.save({ validateBeforeSave: false });

      // Delete used OTP
      await Otp.deleteMany({ email, purpose: "resetPassword" });

      logger.info("Password reset OTP verified", {
        userId: user._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      // SECURITY: Return token in httpOnly cookie instead of response body
      res.cookie("reset_token", resetToken, {
        expires: new Date(Date.now() + 10 * 60 * 1000),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/api/v1/auth/password/reset",
      });

      res.status(200).json({
        success: true,
        message: "OTP verified. You can now reset your password.",
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Reset password
 */
exports.resetPassword = [
  validate(resetPasswordSchema),

  async (req, res, next) => {
    try {
      const { password } = req.body;
      const resetToken = req.cookies?.reset_token;

      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset session. Please start over.",
        });
      }

      // Hash the token to compare with stored hash
      const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select("+passwordHistory");

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "Reset token is invalid or has expired",
        });
      }

      // Check password history
      const isInHistory = await user.isPasswordInHistory(password);
      if (isInHistory) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot reuse a recent password. Please choose a different one.",
        });
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      // Clear reset token cookie
      res.cookie("reset_token", "", {
        expires: new Date(Date.now()),
        httpOnly: true,
        path: "/api/v1/auth/password/reset",
      });

      // Create audit log
      await createAuditLog({
        action: "PASSWORD_RESET",
        userId: user._id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        requestId: req.requestId,
      });

      logger.info("Password reset successful", {
        userId: user._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      sendToken(user, 200, res);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Update profile
 */
exports.updateProfile = [
  validate(updateProfileSchema),

  async (req, res, next) => {
    try {
      const { name, email } = req.body;
      const newUserData = {};

      if (name) newUserData.name = name;
      if (email) {
        // Check if email is already taken by another user
        const existingUser = await User.findOne({
          email,
          _id: { $ne: req.user._id },
        });
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Email is already in use",
          });
        }
        newUserData.email = email;
        // Require re-verification if email changed
        if (email !== req.user.email) {
          newUserData.isVerified = false;
          newUserData.emailVerifiedAt = null;
        }
      }

      const user = await User.findByIdAndUpdate(req.user._id, newUserData, {
        new: true,
        runValidators: true,
      }).select("-password -passwordHistory -mfaSecret -mfaBackupCodes");

      // Create audit log
      await createAuditLog({
        action: "PROFILE_UPDATE",
        userId: req.user._id,
        userRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        details: { updatedFields: Object.keys(newUserData) },
        requestId: req.requestId,
      });

      res.status(200).json({
        success: true,
        user,
        needsReverification: newUserData.isVerified === false,
      });
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Update password
 */
exports.updatePassword = [
  validate(updatePasswordSchema),

  async (req, res, next) => {
    try {
      const { oldPassword, newPassword } = req.body;

      const user = await User.findById(req.user._id).select(
        "+password +passwordHistory",
      );

      const isPasswordMatch = await user.comparePassword(oldPassword);

      if (!isPasswordMatch) {
        logger.warn("Password update failed - wrong old password", {
          userId: req.user._id,
          ip: req.ip,
          requestId: req.requestId,
        });
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      // Check password history
      const isInHistory = await user.isPasswordInHistory(newPassword);
      if (isInHistory) {
        return res.status(400).json({
          success: false,
          message:
            "Cannot reuse a recent password. Please choose a different one.",
        });
      }

      // Check if new password is same as old
      const isSameAsOld = await user.comparePassword(newPassword);
      if (isSameAsOld) {
        return res.status(400).json({
          success: false,
          message: "New password must be different from current password",
        });
      }

      user.password = newPassword;
      await user.save();

      // Create audit log
      await createAuditLog({
        action: "PASSWORD_UPDATE",
        userId: req.user._id,
        userRole: req.user.role,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
        path: req.path,
        method: req.method,
        success: true,
        requestId: req.requestId,
      });

      logger.info("Password updated", {
        userId: req.user._id,
        ip: req.ip,
        requestId: req.requestId,
      });

      sendToken(user, 200, res);
    } catch (error) {
      next(error);
    }
  },
];

/**
 * Helper: Escape HTML to prevent XSS in emails
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
exports.requestSellerAccount = async (req, res, next) => {
  try {
    if (req.user.role === "seller") {
      return res
        .status(400)
        .json({ success: false, message: "You are already a seller" });
    }
    if (req.user.sellerRequest === "pending") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Your request is already pending approval",
        });
    }

    req.user.sellerRequest = "pending";
    await req.user.save({ validateBeforeSave: false });

    res
      .status(200)
      .json({
        success: true,
        message:
          "Seller request submitted successfully. We will review it shortly.",
      });
  } catch (error) {
    next(error);
  }
};
