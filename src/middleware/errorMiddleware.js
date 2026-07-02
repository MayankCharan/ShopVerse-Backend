const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // Set default values
  err.statusCode = err.statusCode || 500;

  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === "development";

  let message = err.message || "Internal Server Error";
  let errorDetails = null;

  // Handle specific error types
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    message = messages.join(", ");
    err.statusCode = 400;
  }

  if (err.name === "CastError") {
    message = "Resource not found";
    err.statusCode = 400;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for ${field}`;
    err.statusCode = 409;
  }

  if (err.name === "JsonWebTokenError") {
    message = "Invalid authentication token";
    err.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    message = "Authentication token expired";
    err.statusCode = 401;
  }

  if (err.type === "entity.parse.failed") {
    message = "Invalid JSON in request body";
    err.statusCode = 400;
  }

  // Log all errors with context
  const logData = {
    requestId: req.requestId,
    statusCode: err.statusCode,
    message: err.message,
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
  };

  if (err.statusCode >= 500) {
    logger.error("Server error", logData);
  } else {
    logger.warn("Client error", logData);
  }

  // Build response
  const response = {
    success: false,
    message,
  };

  // Include details only in development
  if (isDevelopment) {
    response.error = {
      name: err.name,
      stack: err.stack,
      details: errorDetails,
    };
  }

  res.status(err.statusCode).json(response);
};

module.exports = errorHandler;
