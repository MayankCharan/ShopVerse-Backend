const Joi = require("joi");

exports.createCheckoutSessionSchema = Joi.object({
  shippingInfo: Joi.object({
    address: Joi.string().trim().max(200).required(),
    city: Joi.string().trim().max(100).required(),
    state: Joi.string().trim().max(100).required(),
    country: Joi.string().trim().max(100).required(),
    pinCode: Joi.string()
      .pattern(/^\d{5,6}$/)
      .required()
      .messages({
        "string.pattern.base": "Pin code must be 5 or 6 digits",
        "any.required": "Pin code is required",
      }),
    phoneNo: Joi.string()
      .pattern(/^\+?[\d\s-]{10,15}$/)
      .required()
      .messages({
        "string.pattern.base":
          "Please provide a valid phone number (10 to 15 digits)",
        "any.required": "Phone number is required",
      }),
  }).required(),
});

exports.createOrderAfterPaymentSchema = Joi.object({
  session_id: Joi.string().required().messages({
    "any.required": "Session ID is required",
  }),
});
