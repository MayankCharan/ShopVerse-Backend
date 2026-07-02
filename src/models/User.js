const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please enter your name"],
      maxLength: [50, "Name cannot exceed 50 characters"],
      trim: true,
      match: [
        /^[a-zA-Z\s'-]+$/,
        "Name can only contain letters, spaces, hyphens, and apostrophes",
      ],
    },
    email: {
      type: String,
      required: [true, "Please enter your email"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Please enter your password"],
      minLength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    avatar: {
      type: String,
      default: "",
      match: [/^https?:\/\/.+\..+/, "Please enter a valid URL"],
    },
    role: {
      type: String,
      enum: {
        values: ["customer", "seller", "admin"],
        message: "Invalid role",
      },
      default: "customer",
    },

    // SELLER REQUEST FEATURE (Added securely)
    sellerRequest: {
      type: String,
      enum: ["none", "pending", "approved", "rejected"],
      default: "none",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifiedAt: Date,

    isActive: {
      type: Boolean,
      default: true,
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspendedReason: String,
    suspendedAt: Date,

    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,

    passwordChangedAt: Date,
    passwordHistory: [
      {
        password: String,
        changedAt: Date,
      },
    ],
    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    mfaBackupCodes: [
      {
        code: String,
        used: Boolean,
        usedAt: Date,
      },
    ],
    mfaEnabledAt: Date,

    resetPasswordToken: String,
    resetPasswordExpire: Date,

    sessions: [
      {
        deviceId: String,
        deviceName: String,
        deviceType: String,
        ip: String,
        userAgent: String,
        loginAt: Date,
        lastActivity: Date,
        isCurrent: Boolean,
      },
    ],

    lastLogin: Date,
    lastLoginIp: String,
  },
  {
    timestamps: true,
  },
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
  if (!passwordRegex.test(this.password)) {
    throw new Error(
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
    );
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();

  this.passwordHistory = this.passwordHistory || [];
  this.passwordHistory.push({
    password: this.password,
    changedAt: new Date(),
  });

  if (this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.isPasswordInHistory = async function (newPassword) {
  for (const record of this.passwordHistory || []) {
    const isMatch = await bcrypt.compare(newPassword, record.password);
    if (isMatch) return true;
  }
  return false;
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.incrementLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { lockUntil: 1, loginAttempts: 1 },
  });
};

userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
