/**
 * Hojai Core - Shared Types
 * Version: 1.0.0 | Date: May 30, 2026
 */

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  plan?: TenantPlan;
  roles?: string[];
  permissions?: string[];
}

export type TenantPlan = 'starter' | 'professional' | 'enterprise';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: Record<string, unknown> };
  meta: ResponseMeta;
}

export interface ResponseMeta {
  timestamp: string;
  requestId: string;
  tenantId?: string;
  latencyMs?: number;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

export function createResponse<T>(
  data: T,
  options?: { tenantId?: string }
): APIResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`,
      tenantId: options?.tenantId
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, unknown>
): APIResponse<null> {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: `req_${Date.now()}`
    }
  };
}
