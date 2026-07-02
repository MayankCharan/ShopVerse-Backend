const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      "Invalid email format",
    ],
  },
  otpHash: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
    enum: ["verification", "resetPassword", "mfaSetup", "mfaVerify"],
  },
  attempts: {
    type: Number,
    default: 0,
    max: [5, "Maximum verification attempts exceeded"],
  },
  verified: {
    type: Boolean,
    default: false,
  },
  ipAddress: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Indexes
otpSchema.index({ email: 1, purpose: 1, verified: false });
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

// Hash OTP before saving (NO 'next' parameter - Mongoose v9 requirement)
otpSchema.pre("save", async function () {
  if (!this.isModified("otpHash")) return;

  const salt = await bcrypt.genSalt(10);
  this.otpHash = await bcrypt.hash(this.otpHash, salt);
});

// Verify OTP method
otpSchema.methods.verifyOtp = async function (enteredOtp) {
  this.attempts = (this.attempts || 0) + 1;

  if (this.attempts > 5) {
    return { valid: false, message: "Maximum verification attempts exceeded" };
  }

  const isValid = await bcrypt.compare(enteredOtp, this.otpHash);

  if (isValid) {
    this.verified = true;
  }

  await this.save();

  return {
    valid: isValid,
    message: isValid
      ? "OTP verified"
      : `Invalid OTP. ${5 - this.attempts} attempts remaining`,
    attemptsRemaining: 5 - this.attempts,
  };
};

module.exports = mongoose.model("Otp", otpSchema);
