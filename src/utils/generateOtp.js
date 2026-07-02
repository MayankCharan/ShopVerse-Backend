const crypto = require("crypto");

/**
 * Generate a cryptographically secure 6-digit OTP
 * Using crypto.randomInt instead of Math.random for security
 */
const generateOtp = () => {
  // crypto.randomInt is cryptographically secure
  // Range: 100000 to 999999 (6 digits, never starts with 0)
  return crypto.randomInt(100000, 1000000).toString();
};

module.exports = generateOtp;
