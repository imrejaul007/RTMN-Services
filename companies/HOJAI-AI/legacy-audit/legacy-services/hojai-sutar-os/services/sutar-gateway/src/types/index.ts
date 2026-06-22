// ============================================================================
// SUTAR Gateway - Type Definitions
// ============================================================================

// API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Route Configuration
export interface RouteConfig {
  id: string;
  path: string;
  target: string;
  methods: string[];
  stripPath?: boolean;
  timeout?: number;
  retryCount?: number;
  rateLimit?: number;
  cache?: CacheConfig;
  auth?: AuthConfig;
  priority?: number;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyPrefix?: string;
  cacheControl?: string;
}

export interface AuthConfig {
  type: 'none' | 'api_key' | 'jwt' | 'oauth';
  required?: boolean;
  scopes?: string[];
}

// Service Registry Types
export interface ServiceInstance {
  id: string;
  name: string;
  version: string;
  url: string;
  port: number;
  host: string;
  status: ServiceStatus;
  health: ServiceHealth;
  metadata: Record<string, unknown>;
  tags: string[];
  weight: number;
  createdAt: string;
  lastHeartbeat: string;
  failover?: boolean;
  maxRequests?: number;
  currentRequests: number;
}

export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | 'starting' | 'stopping';

export interface ServiceHealth {
  status: ServiceStatus;
  latency: number;
  uptime: number;
  lastCheck: string;
  checks: HealthCheck[];
  score: number;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message?: string;
  timestamp: string;
}

// API Key Management
export interface ApiKey {
  id: string;
  key: string;
  name: string;
  description?: string;
  scopes: string[];
  services: string[];
  expiresAt?: string;
  createdAt: string;
  lastUsed?: string;
  usageCount: number;
  rateLimit?: number;
  active: boolean;
  metadata: Record<string, unknown>;
}

export interface ApiKeyCreateRequest {
  name: string;
  description?: string;
  scopes?: string[];
  services?: string[];
  expiresIn?: number;
  rateLimit?: number;
  metadata?: Record<string, unknown>;
}

// JWT Authentication
export interface JWTPayload {
  sub: string;
  iss: string;
  aud: string[];
  exp: number;
  iat: number;
  jti: string;
  scopes?: string[];
  services?: string[];
  metadata?: Record<string, unknown>;
}

export interface JWTValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expiresAt?: Date;
}

export interface JWTConfig {
  issuer: string;
  audience: string[];
  publicKey?: string;
  secret?: string;
  algorithm: 'HS256' | 'RS256' | 'ES256';
  expiresIn: number;
  clockTolerance?: number;
}

// OAuth Integration
export interface OAuthProvider {
  id: string;
  name: string;
  type: 'google' | 'github' | 'microsoft' | 'facebook' | 'twitter' | 'custom';
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  redirectUri: string;
  enabled: boolean;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  expiresAt: Date;
}

export interface OAuthUserInfo {
  id: string;
  provider: string;
  email?: string;
  name?: string;
  picture?: string;
  metadata: Record<string, unknown>;
}

// Load Balancing
export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'ip_hash' | 'random';
  healthCheckInterval: number;
  healthCheckTimeout: number;
  healthCheckPath: string;
  maxRetries: number;
  circuitBreakerEnabled: boolean;
}

export interface LoadBalancerStats {
  algorithm: string;
  totalRequests: number;
  activeConnections: number;
  distribution: Record<string, number>;
}

// Circuit Breaker
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  halfOpenRequests: number;
  resetInterval: number;
}

export type CircuitState = 'closed' | 'open' | 'halfOpen';

export interface CircuitBreakerState {
  serviceId: string;
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: string;
  nextAttempt?: string;
  halfOpenAttempts: number;
}

// Request Transformation
export interface TransformRule {
  id: string;
  name: string;
  matchPath: string;
  matchMethods?: string[];
  requestTransform?: TransformConfig;
  responseTransform?: TransformConfig;
  enabled: boolean;
  priority: number;
}

export interface TransformConfig {
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  bodyMapping?: Record<string, string>;
  removeFields?: string[];
  addFields?: Record<string, unknown>;
}

// Response Caching
export interface CacheEntry {
  key: string;
  value: unknown;
  ttl: number;
  createdAt: string;
  expiresAt: string;
  size: number;
  hitCount: number;
  metadata: Record<string, unknown>;
}

export interface CacheStats {
  totalKeys: number;
  totalSize: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
  oldestEntry?: string;
  newestEntry?: string;
}

// WebSocket Support
export interface WebSocketConnection {
  id: string;
  serviceId: string;
  serviceName?: string;
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  connectedAt: string;
  lastMessage?: string;
  messageCount: number;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

// Metrics Collection
export interface Metric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface MetricBucket {
  le: number;
  count: number;
}

export interface HistogramMetric {
  name: string;
  count: number;
  sum: number;
  buckets: MetricBucket[];
  labels: Record<string, string>;
}

export interface AggregatedMetrics {
  timestamp: string;
  uptime: number;
  requests: {
    total: number;
    success: number;
    error: number;
    byStatus: Record<string, number>;
    byMethod: Record<string, number>;
    byPath: Record<string, number>;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p90: number;
    p99: number;
  };
  services: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  cache: {
    hitRate: number;
    hits: number;
    misses: number;
  };
}

// Distributed Tracing
export interface Trace {
  id: string;
  requestId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  method: string;
  path: string;
  service: string;
  status: number;
  spans: TraceSpan[];
  logs: TraceLog[];
  metadata: Record<string, unknown>;
}

export interface TraceSpan {
  id: string;
  name: string;
  serviceId: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  tags: Record<string, string>;
  logs: TraceLog[];
  status: 'ok' | 'error';
}

export interface TraceLog {
  timestamp: string;
  fields: Record<string, unknown>;
}

// Health Aggregation
export interface AggregatedHealth {
  timestamp: string;
  overall: ServiceStatus;
  score: number;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    unknown: number;
  };
  recommendations: HealthRecommendation[];
}

export interface HealthRecommendation {
  severity: 'critical' | 'warning' | 'info';
  service: string;
  message: string;
  action?: string;
}

// Configurations
export interface GatewayConfig {
  port: number;
  environment: 'development' | 'staging' | 'production';
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  loadBalancer: LoadBalancerConfig;
  circuitBreaker: CircuitBreakerConfig;
  cache: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
  };
  metrics: {
    enabled: boolean;
    interval: number;
  };
  tracing: {
    enabled: boolean;
    sampleRate: number;
  };
  security: {
    corsOrigins: string[];
    apiKeyHeader: string;
    jwtSecret?: string;
  };
}
