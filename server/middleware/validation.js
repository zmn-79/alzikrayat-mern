const Joi = require('joi');
const mongoose = require('mongoose');

// ---- Joi schemas -----------------------------------------------------------
const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(1).max(50).required(),
  lastName: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().trim().lowercase().email().max(100).required(),
  // bcrypt only uses the first 72 bytes, so cap the length there.
  password: Joi.string().min(8).max(72)
    .pattern(/[A-Za-z]/, 'letter').pattern(/\d/, 'number').required()
    .messages({
      'string.pattern.name': 'Password must contain at least one letter and one number',
    }),
  location: Joi.string().trim().max(100).allow('', null),
  occupation: Joi.string().trim().max(100).allow('', null),
  description: Joi.string().trim().max(1000).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().max(72).required(),
});

const photoSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(2000).allow('', null),
});

const commentSchema = Joi.object({
  comment: Joi.string().trim().min(1).max(1000).required(),
});

// ---- Middleware factories --------------------------------------------------
/**
 * validate(schema) -> middleware that validates req.body with Joi, replaces it
 * with the sanitised value (trimmed, unknown keys stripped) and answers 400
 * with a list of human-readable messages when validation fails.
 * `onFail` lets the photo route clean up an already-uploaded file.
 */
const validate = (schema, onFail) => (req, res, next) => {
  const { error, value } = schema.validate(req.body || {}, {
    abortEarly: false,
    stripUnknown: true,
    errors: { label: 'key', wrap: { label: false } },
  });
  if (error) {
    if (onFail) onFail(req);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map((d) => d.message),
    });
  }
  req.body = value;
  next();
};

/** Rejects malformed MongoDB ObjectIds with 400 before they reach Mongoose. */
const validateObjectId = (param = 'id') => (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params[param]) ||
      !/^[0-9a-fA-F]{24}$/.test(req.params[param])) {
    return res.status(400).json({ success: false, message: `Invalid ${param}` });
  }
  next();
};

module.exports = {
  validate,
  validateObjectId,
  validateRegister: validate(registerSchema),
  validateLogin: validate(loginSchema),
  validateComment: validate(commentSchema),
  photoSchema,
};
