const mongoose = require("mongoose");

/**
 * Tamper-resistant audit logs
 * Once created, these should not be modified or deleted
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      index: true,
    },
    userRole: String,
    ipAddress: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: String,
    path: {
      type: String,
      required: true,
    },
    method: String,
    statusCode: Number,
    success: Boolean,
    details: mongoose.Schema.Types.Mixed,
    requestId: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    strict: true,
  },
);

// Indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });

// Prevent modifications after creation
auditLogSchema.pre("save", function (next) {
  if (this.isNew) return next();
  next(new Error("Audit logs cannot be modified"));
});

auditLogSchema.pre("remove", function (next) {
  next(new Error("Audit logs cannot be deleted"));
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
