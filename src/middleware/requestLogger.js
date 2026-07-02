const logger = require("../utils/logger");

/**
 * Log requests without logging sensitive data
 */
exports.requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Capture original end
  const originalEnd = res.end;

  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const logData = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("User-Agent")
        ? req.get("User-Agent").substring(0, 100)
        : null,
    };

    // Don't log request body for sensitive endpoints
    const sensitivePaths = ["/login", "/password", "/signup", "/payment"];
    const isSensitive = sensitivePaths.some((p) => req.path.includes(p));

    if (!isSensitive && req.body && Object.keys(req.body).length > 0) {
      logData.bodyKeys = Object.keys(req.body);
    }

    if (res.statusCode >= 400) {
      logger.warn("Request completed with error", logData);
    } else if (res.statusCode >= 500) {
      logger.error("Server error on request", logData);
    } else {
      logger.info("Request completed", logData);
    }

    originalEnd.apply(res, args);
  };

  next();
};
