const Joi = require("joi");

exports.createReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "any.required": "Please provide a rating",
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be a whole number",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
  }),
  comment: Joi.string().trim().min(10).max(500).required().messages({
    "any.required": "Please provide a comment",
    "string.empty": "Comment cannot be empty",
    "string.min": "Comment must be at least 10 characters",
    "string.max": "Comment cannot exceed 500 characters",
  }),
});

exports.getProductsSchema = Joi.object({
  keyword: Joi.string()
    .trim()
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-']+$/)
    .optional()
    .messages({
      "string.pattern.base": "Invalid search characters",
    }),
  category: Joi.string().trim().max(50).optional(),
  page: Joi.number().integer().min(1).max(1000).default(1),
  limit: Joi.number().integer().min(1).max(50).default(8),
  sort: Joi.string()
    .valid("priceLow", "priceHigh", "rating", "newest")
    .default("newest"),
});
