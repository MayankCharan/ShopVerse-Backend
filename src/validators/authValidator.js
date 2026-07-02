const Joi = require("joi");

const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const emailPattern = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

exports.sendSignupOtpSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      "any.required": "Please enter your name",
      "string.empty": "Name cannot be empty",
      "string.min": "Name must be at least 2 characters",
      "string.max": "Name cannot exceed 50 characters",
      "string.pattern.base":
        "Name can only contain letters, spaces, hyphens, and apostrophes",
    }),

  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(emailPattern)
    .required()
    .messages({
      "any.required": "Please enter your email",
      "string.empty": "Email cannot be empty",
      "string.pattern.base": "Please enter a valid email address",
    }),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "any.required": "Please enter your password",
      "string.empty": "Password cannot be empty",
      "string.min": "Password must be at least 8 characters",
      "string.max": "Password cannot exceed 128 characters",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    }),
});

exports.verifyOtpAndSignupSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required(),
  email: Joi.string().trim().lowercase().pattern(emailPattern).required(),
  password: Joi.string().min(8).max(128).pattern(passwordPattern).required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      "any.required": "Please enter the OTP",
      "string.length": "OTP must be 6 digits",
      "string.pattern.base": "OTP must be 6 digits",
    }),
});

exports.loginSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(emailPattern)
    .required()
    .messages({
      "any.required": "Please enter your email",
    }),
  password: Joi.string().required().messages({
    "any.required": "Please enter your password",
  }),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(emailPattern)
    .required()
    .messages({
      "any.required": "Please enter your email",
    }),
});

exports.verifyResetOtpSchema = Joi.object({
  email: Joi.string().trim().lowercase().pattern(emailPattern).required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required(),
});

exports.resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "any.required": "Please enter new password",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    }),
  confirmPassword: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
  resetToken: Joi.string().length(40).hex().required().messages({
    "string.length": "Invalid reset token",
  }),
});

exports.updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional(),
  email: Joi.string().trim().lowercase().pattern(emailPattern).optional(),
})
  .min(1)
  .messages({
    "object.min": "Please provide at least one field to update",
  });

exports.updatePasswordSchema = Joi.object({
  oldPassword: Joi.string().required().messages({
    "any.required": "Please enter your current password",
  }),
  newPassword: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordPattern)
    .required()
    .messages({
      "any.required": "Please enter new password",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Passwords do not match",
    }),
});
