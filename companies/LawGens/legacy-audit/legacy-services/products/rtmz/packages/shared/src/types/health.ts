export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  uptime: number;
  timestamp: string;
  checks?: {
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }[];
}

export interface ReadinessStatus {
  status: 'ready' | 'not_ready';
  checks: {
    database: 'up' | 'down';
    cache: 'up' | 'down';
    dependencies: Record<string, 'up' | 'down'>;
  };
}
