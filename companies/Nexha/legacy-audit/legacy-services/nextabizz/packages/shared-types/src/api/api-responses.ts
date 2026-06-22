import { z } from 'zod';

// ============================================
// Error Response
// ============================================
export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export const ErrorResponseSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
});

// ============================================
// Generic API Response
// ============================================
export interface ApiResponse<T> {
  data?: T;
  error?: ErrorResponse;
  message?: string;
  success: boolean;
}

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.unknown().optional(),
  error: ErrorResponseSchema.optional(),
});

// ============================================
// Pagination
// ============================================
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPrevPage: z.boolean(),
});

// ============================================
// Paginated Response
// ============================================
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
  message?: string;
  success: boolean;
}

export const PaginatedResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.array(z.unknown()),
  pagination: PaginationMetaSchema,
});

// ============================================
// List Response (simple array with metadata)
// ============================================
export interface ListResponse<T> {
  items: T[];
  total: number;
  message?: string;
  success: boolean;
}

export const ListResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  items: z.array(z.unknown()),
  total: z.number().int().nonnegative(),
});

// ============================================
// Created Response
// ============================================
export interface CreatedResponse<T> {
  data: T;
  message?: string;
  success: true;
}

export const CreatedResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.unknown(),
});

// ============================================
// Updated Response
// ============================================
export interface UpdatedResponse<T> {
  data: T;
  message?: string;
  success: true;
  updated: boolean;
}

export const UpdatedResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  data: z.unknown(),
  updated: z.boolean(),
});

// ============================================
// Deleted Response
// ============================================
export interface DeletedResponse {
  deleted: boolean;
  message?: string;
  success: true;
}

export const DeletedResponseSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
  deleted: z.boolean(),
});

// ============================================
// Validation Error Response
// ============================================
export interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  };
}

export const ValidationErrorDetailSchema = z.object({
  field: z.string(),
  message: z.string(),
  code: z.string(),
});

export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('VALIDATION_ERROR'),
    message: z.string(),
    details: z.array(ValidationErrorDetailSchema),
  }),
});

// ============================================
// Not Found Response
// ============================================
export interface NotFoundResponse {
  success: false;
  error: {
    code: 'NOT_FOUND';
    message: string;
    resource?: string;
    id?: string;
  };
}

export const NotFoundResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('NOT_FOUND'),
    message: z.string(),
    resource: z.string().optional(),
    id: z.string().optional(),
  }),
});

// ============================================
// Unauthorized Response
// ============================================
export interface UnauthorizedResponse {
  success: false;
  error: {
    code: 'UNAUTHORIZED';
    message: string;
  };
}

export const UnauthorizedResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('UNAUTHORIZED'),
    message: z.string(),
  }),
});

// ============================================
// Forbidden Response
// ============================================
export interface ForbiddenResponse {
  success: false;
  error: {
    code: 'FORBIDDEN';
    message: string;
  };
}

export const ForbiddenResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('FORBIDDEN'),
    message: z.string(),
  }),
});

// ============================================
// Conflict Response
// ============================================
export interface ConflictResponse {
  success: false;
  error: {
    code: 'CONFLICT';
    message: string;
    existingResource?: string;
  };
}

export const ConflictResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal('CONFLICT'),
    message: z.string(),
    existingResource: z.string().optional(),
  }),
});

// ============================================
// Health Check Response
// ============================================
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks?: Record<string, {
    status: 'ok' | 'error';
    message?: string;
    latency?: number;
  }>;
}

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  timestamp: z.string().datetime(),
  version: z.string(),
  uptime: z.number().nonnegative(),
  checks: z.record(z.object({
    status: z.enum(['ok', 'error']),
    message: z.string().optional(),
    latency: z.number().optional(),
  })).optional(),
});
