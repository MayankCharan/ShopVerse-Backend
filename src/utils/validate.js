const logger = require("./logger");

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      logger.warn("Validation failed", {
        errors,
        path: req.path,
        ip: req.ip,
        requestId: req.requestId,
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Replace req.body with validated/sanitized data
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors,
      });
    }

    req.query = value;
    next();
  };
};

module.exports = { validate, validateQuery };
