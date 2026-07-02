const Joi = require("joi");

exports.addToCartSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "any.required": "Product ID is required",
      "string.pattern.base": "Invalid product ID format",
    }),
  quantity: Joi.number().integer().min(1).max(10).default(1).messages({
    "number.min": "Quantity must be at least 1",
    "number.max": "Maximum 10 items per product",
  }),
});

exports.updateCartItemSchema = Joi.object({
  productId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      "any.required": "Product ID is required",
      "string.pattern.base": "Invalid product ID format",
    }),
  quantity: Joi.number().integer().min(0).max(10).required().messages({
    "any.required": "Quantity is required",
    "number.min": "Quantity must be at least 0",
    "number.max": "Maximum 10 items per product",
  }),
});
