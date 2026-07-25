import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(5000),

  DATABASE_URL: Joi.string().required(),

  JWT_ACCESS_SECRET: Joi.string().required(),
  JWT_REFRESH_SECRET: Joi.string().required(),

  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('90d'),

  EMAIL_USER: Joi.string().email().required(),
  EMAIL_PASS: Joi.string().required(),

  CLOUDINARY_CLOUD_NAME: Joi.string().required().allow(''),
  CLOUDINARY_API_KEY: Joi.string().required().allow(''),
  CLOUDINARY_API_SECRET: Joi.string().required().allow(''),
});
