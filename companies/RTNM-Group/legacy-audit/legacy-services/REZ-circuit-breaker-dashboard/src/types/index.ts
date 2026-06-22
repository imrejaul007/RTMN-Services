import { z } from 'zod';

/**
 * Circuit Breaker States
 */
export enum CircuitState {
  CLOSED = 'CLOSED',      // Normal operation, requests pass through
  OPEN = 'OPEN',          // Failing, requests blocked
  HALF_OPEN = 'HALF_OPEN' // Testing if service recovered
}

/**
 * Service Types in REZ Ecosystem
 */
export enum ServiceCategory {
  RABTUL = 'RABTUL',           // Shared infrastructure
  REZ_MEDIA = 'REZ_MEDIA',     // Advertising & Marketing
  REZ_INTELLIGENCE = 'REZ_INTELLIGENCE', // AI/ML
  RTNM_GROUP = 'RTNM_GROUP',  // Core platform
  REZ_CONSUMER = 'REZ_CONSUMER', // Consumer apps
  STAY_OWN = 'STAY_OWN'       // Hospitality
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;    // Number of failures before opening
  successThreshold: number;    // Number of successes in half-open to close
  timeout: number;             // Time in ms before trying half-open
  resetTimeout: number;        // Time in ms between reset attempts
  halfOpenMaxCalls: number;    // Max calls in half-open state
}

/**
 * Circuit Breaker State
 */
export interface CircuitBreaker {
  name: string;
  serviceName: string;
  category: ServiceCategory;
  state: CircuitState;
  config: CircuitBreakerConfig;
  failureCount: number;
  successCount: number;
  lastFailure: Date | null;
  lastSuccess: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  halfOpenAt: Date | null;
  totalRequests: number;
  failedRequests: number;
  successfulRequests: number;
  lastUpdated: Date;
}

/**
 * Service Health Status
 */
export interface ServiceHealth {
  name: string;
  category: ServiceCategory;
  url: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  responseTime: number | null;
  lastCheck: Date;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  uptimePercentage: number;
  circuitState: CircuitState;
  version?: string;
}

/**
 * Alert Configuration
 */
export const AlertConfigSchema = z.object({
  id: z.string().optional(),
  enabled: z.boolean(),
  channels: z.object({
    email: z.boolean(),
    slack: z.boolean(),
    webhook: z.boolean()
  }),
  thresholds: z.object({
    failureRatePercent: z.number().min(0).max(100),
    responseTimeMs: z.number().min(0),
    consecutiveFailures: z.number().min(1)
  }),
  services: z.array(z.string()).optional(), // Empty means all services
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

export type AlertConfig = z.infer<typeof AlertConfigSchema>;

/**
 * Alert Event
 */
export interface AlertEvent {
  id: string;
  timestamp: Date;
  serviceName: string;
  category: ServiceCategory;
  type: 'circuit_open' | 'circuit_close' | 'circuit_half_open' | 'high_failure_rate' | 'slow_response' | 'service_down';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: {
    circuitState?: CircuitState;
    failureRate?: number;
    responseTime?: number;
    consecutiveFailures?: number;
  };
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

/**
 * Historical Failure Record
 */
export interface FailureRecord {
  id: string;
  serviceName: string;
  circuitName: string;
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  duration: number;
  circuitState: CircuitState;
  metadata?: Record<string, unknown>;
}

/**
 * Recovery Record
 */
export interface RecoveryRecord {
  id: string;
  serviceName: string;
  circuitName: string;
  timestamp: Date;
  downtimeDuration: number;
  failureCount: number;
  wasAutomatic: boolean;
}

/**
 * Aggregate Health Statistics
 */
export interface HealthStats {
  totalServices: number;
  healthyServices: number;
  unhealthyServices: number;
  degradedServices: number;
  unknownServices: number;
  overallHealthPercentage: number;
  openCircuits: number;
  halfOpenCircuits: number;
  closedCircuits: number;
  averageResponseTime: number;
  totalFailures24h: number;
  totalRequests24h: number;
  failureRate24h: number;
  uptimePercentage: number;
}

/**
 * WebSocket Event Types
 */
export enum WS_EVENT_TYPE {
  CIRCUIT_STATE_CHANGED = 'circuit_state_changed',
  SERVICE_HEALTH_CHANGED = 'service_health_changed',
  ALERT_CREATED = 'alert_created',
  ALERT_ACKNOWLEDGED = 'alert_acknowledged',
  HEALTH_STATS_UPDATED = 'health_stats_updated',
  RECOVERY_DETECTED = 'recovery_detected'
}

export interface WSEvent {
  type: WS_EVENT_TYPE;
  payload: unknown;
  timestamp: Date;
}

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  circuits: CircuitBreaker[];
  services: ServiceHealth[];
  alerts: AlertEvent[];
  healthStats: HealthStats;
  recentFailures: FailureRecord[];
  recentRecoveries: RecoveryRecord[];
  timestamp: Date;
}

/**
 * API Response Types
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: Date;
}
