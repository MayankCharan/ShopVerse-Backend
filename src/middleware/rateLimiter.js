const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const logger = require("../utils/logger");

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later",
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded (general)", {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later",
    });
  },
});

/**
 * Strict rate limiter for auth endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: "Too many login attempts. Please try again after 15 minutes.",
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded (auth)", {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again after 15 minutes.",
    });
  },
});

/**
 * OTP generation rate limiter (very strict)
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 OTPs per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again after 1 hour.",
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded (OTP)", {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });
    res.status(429).json({
      success: false,
      message: "Too many OTP requests. Please try again after 1 hour.",
    });
  },
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please try again after 1 hour.",
  },
  handler: (req, res) => {
    logger.warn("Rate limit exceeded (password reset)", {
      ip: req.ip,
      path: req.path,
      requestId: req.requestId,
    });
    res.status(429).json({
      success: false,
      message:
        "Too many password reset attempts. Please try again after 1 hour.",
    });
  },
});

/**
 * Review creation rate limiter
 */
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many reviews. Please try again later.",
  },
});

/**
 * Payment rate limiter
 */
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many payment attempts. Please try again later.",
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  reviewLimiter,
  paymentLimiter,
};
