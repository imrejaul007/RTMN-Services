/**
 * RTMN Shared SDK
 *
 * Centralized SDK for all RTMN services providing:
 * - Authentication & Authorization
 * - Security Middleware
 * - Validation
 * - Error Handling
 * - Logging
 * - Health Checks
 * - Circuit Breakers
 *
 * @company RTMN
 * @version 1.0.0
 */

export {
  // Auth
  AuthMiddleware,
  TokenService,
  HIPAAAuditLogger,
  createAuthMiddleware,
  createTokenService,
  type RTMNUser,
  type AuthenticatedRequest,
  type AuditEvent,
  // Security
  createCorsMiddleware,
  createHelmetMiddleware,
  createRateLimiters,
  type SecurityConfig,
  type RateLimitConfig,
  // Validation
  validateRequest,
  // Error Handling
  AppError,
  errorHandler,
  // Logging
  Logger,
  requestLogger,
  requestIdMiddleware,
  type LogEntry,
  // Health
  createHealthCheck,
  type HealthStatus,
  // Utilities
  CircuitBreaker,
  parsePagination,
  createPaginatedResponse,
  type PaginationParams,
  type PaginationResult,
} from './middleware/auth';
export * from './middleware/security';