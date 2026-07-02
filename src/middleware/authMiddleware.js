const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const logger = require("../utils/logger");

/**
 * Verify JWT access token
 */
const isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please login to access this resource",
      });
    }

    // Check if token is blacklisted (logged out)
    const isBlacklisted = await TokenBlacklist.findOne({ token });
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }

    // Verify token with explicit algorithm to prevent algorithm confusion
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
      clockTolerance: 30, // 30 seconds clock skew tolerance
    });

    // Get user and verify still exists and is active
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Account has been suspended. Contact support.",
      });
    }

    // Check if password was changed after token was issued
    if (
      user.passwordChangedAt &&
      decoded.iat < user.passwordChangedAt.getTime() / 1000
    ) {
      return res.status(401).json({
        success: false,
        message: "Password was changed recently. Please login again.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
        code: "TOKEN_EXPIRED",
      });
    }

    if (error.name === "JsonWebTokenError") {
      logger.warn("Invalid JWT token attempt", {
        ip: req.ip,
        path: req.path,
        error: error.message,
        requestId: req.requestId,
      });
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/**
 * Verify email is confirmed
 */
const isVerified = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: "Please verify your email first",
      code: "EMAIL_NOT_VERIFIED",
    });
  }
  next();
};

/**
 * Check MFA verification status
 */
const isMfaVerified = (req, res, next) => {
  if (req.user.mfaEnabled && !req.mfaVerified) {
    return res.status(403).json({
      success: false,
      message: "MFA verification required",
      code: "MFA_REQUIRED",
    });
  }
  next();
};

/**
 * Role-based access control
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn("Unauthorized role access attempt", {
        userId: req.user._id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }
    next();
  };
};

module.exports = {
  isAuthenticated,
  isVerified,
  isMfaVerified,
  authorizeRoles,
};
