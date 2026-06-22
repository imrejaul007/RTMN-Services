// SUTAR Monitoring Service - Type Definitions

// Logger Types (must be defined first as other types reference them)
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  service?: string;
  metadata?: Record<string, unknown>;
}

// Configuration
export interface Config {
  port: number;
  environment: string;
  logLevel: LogLevel;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

// Service Health Types
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface ServiceHealth {
  serviceName: string;
  status: ServiceStatus;
  lastCheck: string;
  responseTime: number;
  uptimePercent: number;
  errorCount: number;
  requestCount: number;
  metadata?: Record<string, unknown>;
}

export interface AggregateHealth {
  overallStatus: ServiceStatus;
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  services: ServiceHealth[];
  timestamp: string;
}

// Metrics Types
export interface ServiceMetrics {
  serviceName: string;
  requests: {
    total: number;
    success: number;
    failed: number;
    rate: number;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errors: {
    total: number;
    rate: number;
    byType: Record<string, number>;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      percent: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
  };
  timestamp: string;
}

export interface AggregateMetrics {
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  avgResponseTime: number;
  services: ServiceMetrics[];
  timestamp: string;
}

// Alert Types
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  serviceName: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertRequest {
  serviceName: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  metadata?: Record<string, unknown>;
}

// Uptime Types
export interface UptimeRecord {
  timestamp: string;
  status: ServiceStatus;
  responseTime: number;
}

export interface UptimeStats {
  serviceName: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  uptime: {
    total: number;
    percent: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  incidents: {
    total: number;
    critical: number;
    warning: number;
  };
  history: UptimeRecord[];
  avgResponseTime: number;
  timestamp: string;
}

// Performance Types
export interface PerformanceMetrics {
  throughput: {
    requestsPerSecond: number;
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  latency: {
    globalAvg: number;
    globalP50: number;
    globalP95: number;
    globalP99: number;
  };
  errorRate: {
    current: number;
    avg: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  availability: {
    current: number;
    last24h: number;
    last7d: number;
    last30d: number;
  };
  alerts: {
    active: number;
    critical: number;
    warning: number;
  };
  topServices: {
    byRequests: Array<{ name: string; count: number }>;
    byErrors: Array<{ name: string; count: number }>;
    byLatency: Array<{ name: string; latency: number }>;
  };
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Integration Types
export interface SUTARService {
  name: string;
  port: number;
  status: ServiceStatus;
  healthEndpoint: string;
}

export const SUTAR_SERVICES: SUTARService[] = [
  { name: 'sutar-gateway', port: 4140, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-intent-bus', port: 4154, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-agent-id', port: 4100, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-agent-network', port: 4101, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-contract-os', port: 4102, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-decision-engine', port: 4103, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-discovery-engine', port: 4104, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-economy-os', port: 4105, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-exploration-engine', port: 4106, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-flow-os', port: 4107, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-goal-os', port: 4108, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-identity-os', port: 4109, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-marketplace', port: 4110, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-memory-bridge', port: 4111, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-multi-agent-evaluator', port: 4112, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-negotiation-engine', port: 4113, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-network-learning', port: 4114, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-policy-os', port: 4115, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-reputation-aggregator', port: 4116, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-roi-calculator', port: 4117, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-simulation-os', port: 4118, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-trust-engine', port: 4119, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-twin-os', port: 4120, status: 'unknown', healthEndpoint: '/health' },
  { name: 'sutar-usage-tracker', port: 4121, status: 'unknown', healthEndpoint: '/health' },
];
