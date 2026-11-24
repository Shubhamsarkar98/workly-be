import * as Joi from 'joi';

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  REDIS_FALLBACK: Joi.string().valid('none', 'memory').default('none'),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .required(),
  JWT_ACCESS_TTL: Joi.string()
    .pattern(/^[1-9]\d*(ms|s|m|h|d|w|y)$/)
    .default('15m'),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(60).default(604800),
  BOOTSTRAP_ADMIN_EMAIL: Joi.string().email().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: Joi.string().min(12).optional(),
}).and('BOOTSTRAP_ADMIN_EMAIL', 'BOOTSTRAP_ADMIN_PASSWORD');
