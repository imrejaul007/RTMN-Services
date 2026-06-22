/**
 * @rez/validation - Standardized Zod Schemas
 *
 * Features:
 * - Common schemas (email, phone, password)
 * - API request/response schemas
 * - Database entity schemas
 * - Event schemas
 */

import { z, ZodSchema, RefinementCtx } from 'zod';

// ============================================
// Common Primitives
// ============================================

export const email = z.string().email('Invalid email address');

export const phone = z.string().regex(
  /^(\+91)?[\s-]?[6-9]\d{9}$/,
  'Invalid phone number'
);

export const uuid = z.string().uuid('Invalid UUID');

export const url = z.string().url('Invalid URL').optional();

export const dateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  'Invalid date'
);

export const isoDateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)) && val.includes('T'),
  'Invalid ISO date string'
);

// ============================================
// Password & Secrets
// ============================================

export const password = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const apiKey = z.string()
  .min(16, 'API key must be at least 16 characters')
  .regex(/^[A-Za-z0-9_-]+$/, 'API key contains invalid characters');

// ============================================
// Pagination & Sorting
// ============================================

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cursorPagination = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const sorting = z.object({
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// ============================================
// API Response Schemas
// ============================================

export const apiSuccess = <T extends ZodSchema>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema,
  meta: z.object({
    timestamp: isoDateString,
    requestId: z.string().optional(),
  }).optional(),
});

export const apiError = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.object({
      path: z.string(),
      message: z.string(),
    })).optional(),
  }),
});

export const paginatedResponse = <T extends ZodSchema>(itemSchema: T) => z.object({
  success: z.literal(true),
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasMore: z.boolean(),
  }),
});

// ============================================
// User Schemas
// ============================================

export const userSchemas = {
  create: z.object({
    email: email,
    password: password,
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    phone: phone.optional(),
    role: z.enum(['super_admin', 'admin', 'operator', 'analyst', 'support', 'merchant', 'viewer']).optional(),
  }),

  update: z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    phone: phone.optional(),
  }),

  response: z.object({
    id: uuid,
    email: email,
    firstName: z.string(),
    lastName: z.string(),
    phone: phone.nullable(),
    role: z.string(),
    createdAt: isoDateString,
    updatedAt: isoDateString,
  }),
};

// ============================================
// Auth Schemas
// ============================================

export const authSchemas = {
  login: z.object({
    email: email,
    password: z.string().min(1),
  }),

  register: userSchemas.create,

  tokenRefresh: z.object({
    refreshToken: z.string().min(1),
  }),

  tokenResponse: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    expiresIn: z.number(),
    tokenType: z.literal('Bearer'),
  }),
};

// ============================================
// Common Entity Schemas
// ============================================

export const baseEntity = z.object({
  id: uuid,
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const softDeleteEntity = baseEntity.extend({
  deletedAt: isoDateString.nullable(),
});

// ============================================
// Health Check Schema
// ============================================

export const healthCheck = z.object({
  status: z.enum(['healthy', 'unhealthy', 'degraded']),
  timestamp: isoDateString,
  version: z.string().optional(),
  services: z.record(z.object({
    status: z.enum(['up', 'down']),
    latency: z.number().optional(),
    error: z.string().optional(),
  })).optional(),
});

// ============================================
// Webhook Event Schemas
// ============================================

export const webhookEvent = z.object({
  id: uuid,
  type: z.string(),
  timestamp: isoDateString,
  data: z.record(z.unknown()),
});

// ============================================
// Schema Factory
// ============================================

export function createSchema<T extends Record<string, ZodSchema>>(
  shape: T
): ZodSchema {
  return z.object(shape);
}

export function createPartialSchema<T extends Record<string, ZodSchema>>(
  shape: T
): ZodSchema {
  const partial: Record<string, ZodSchema> = {};
  for (const [key, schema] of Object.entries(shape)) {
    partial[key] = schema.optional();
  }
  return z.object(partial);
}

// ============================================
// All Schemas Export
// ============================================

export const schemas = {
  email,
  phone,
  uuid,
  url,
  dateString,
  isoDateString,
  password,
  apiKey,
  pagination,
  cursorPagination,
  sorting,
  apiSuccess,
  apiError,
  paginatedResponse,
  user: userSchemas,
  auth: authSchemas,
  baseEntity,
  softDeleteEntity,
  healthCheck,
  webhookEvent,
};

export type { ZodSchema, RefinementCtx };

export default schemas;

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'validation',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
