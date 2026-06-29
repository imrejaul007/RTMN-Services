/**
 * Standard error response and helpers
 */

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    service?: string;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
    service?: string;
  };
}

export function ok<T>(res: any, data: T, service?: string) {
  res.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      service,
    },
  });
}

export function fail(res: any, code: string, message: string, status = 500, details?: any, service?: string) {
  res.status(status).json({
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      service,
    },
  });
}

export const ERRORS = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL: 'INTERNAL',
  DOWNSTREAM: 'DOWNSTREAM',
  TIMEOUT: 'TIMEOUT',
  MISSING_PARAMS: 'MISSING_PARAMS',
  CONFLICT: 'CONFLICT',
  DISABLED: 'DISABLED',
};