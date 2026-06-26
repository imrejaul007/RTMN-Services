/**
 * Common Types for Twin Services
 * Shared types used across all twin services
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: Pagination;
}

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Timestamps for audit
 */
export interface Timestamps {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/**
 * Standard health check response
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks?: Record<string, HealthCheck>;
}

export interface HealthCheck {
  status: 'ok' | 'error' | 'warning';
  message?: string;
  latency?: number;
}

/**
 * Standard ready check response
 */
export interface ReadyResponse {
  ready: boolean;
  service: string;
  timestamp: string;
  dependencies?: Record<string, boolean>;
}

/**
 * Request ID middleware
 */
export interface RequestWithId extends Request {
  requestId: string;
  user?: AuthUser;
}

/**
 * Auth user from JWT
 */
export interface AuthUser {
  id: string;
  role: 'admin' | 'superadmin' | 'hr' | 'user' | 'service';
  organizationId?: string;
  email?: string;
  permissions?: string[];
}

/**
 * Event types
 */
export type EventType =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'activated'
  | 'deactivated'
  | 'error';

/**
 * Emit an event
 */
export interface TwinEvent<T = any> {
  id: string;
  type: EventType;
  source: string;
  employeeId?: string;
  twinId?: string;
  data: T;
  timestamp: string;
}

/**
 * Service configuration
 */
export interface ServiceConfig {
  name: string;
  port: number;
  version: string;
  environment: string;
}

/**
 * Error with status code
 */
export class ApiException extends Error {
  statusCode: number;
  code: string;
  details?: Record<string, any>;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR', details?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Utility to create a validation result
 */
export function validate(required: string[], data: Record<string, any>): ValidationResult {
  const errors: string[] = [];
  for (const field of required) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Generate a unique ID with prefix
 */
export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Sanitize search input
 */
export function sanitizeSearchInput(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .substring(0, 200);
}

/**
 * ISO timestamp
 */
export function timestamp(): string {
  return new Date().toISOString();
}

// Re-export express types for convenience
import { Request } from 'express';
