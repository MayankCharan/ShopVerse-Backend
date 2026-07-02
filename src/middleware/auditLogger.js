const logger = require("../utils/logger");

/**
 * Audit log for sensitive operations
 */
const auditLog = (action) => {
  return async (req, res, next) => {
    // Capture original json
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      const auditData = {
        action,
        requestId: req.requestId,
        userId: req.user?._id,
        userRole: req.user?.role,
        ip: req.ip,
        userAgent: req.get("User-Agent")?.substring(0, 100),
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        success: data.success,
        timestamp: new Date().toISOString(),
      };

      // Log specific details based on action
      if (action.includes("LOGIN")) {
        auditData.email = req.body?.email;
      }

      if (action.includes("PASSWORD")) {
        auditData.userId = req.user?._id || req.body?.email;
      }

      if (action.includes("PAYMENT")) {
        auditData.orderId = data.order?._id;
        auditData.amount = data.order?.totalPrice;
      }

      if (action.includes("ORDER")) {
        auditData.orderId = data.order?._id || req.params?.id;
      }

      if (action.includes("PROFILE")) {
        auditData.updatedFields = Object.keys(req.body || {});
      }

      logger.info(`AUDIT: ${action}`, auditData);

      originalJson(data);
    };

    next();
  };
};

module.exports = auditLog;
