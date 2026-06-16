export interface TenantContext {
  tenantId: string;
  projectId?: string;
  userId?: string;
  userRole?: string;
}

export interface RequestWithTenant extends Express.Request {
  tenant?: TenantContext;
  startTime?: number;
  traceId?: string;
}

export interface ServiceRoute {
  path: string;
  targetUrl: string;
  methods?: string[];
  auth?: boolean;
  rateLimit?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, boolean>;
  timestamp: string;
}
