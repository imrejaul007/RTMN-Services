export type HealthStatus = 'healthy' | 'degraded' | 'down';
export type ServiceHealth = {
  name: string;
  status: HealthStatus;
  latency?: number;
  uptime?: number;
};
export type Incident = {
  id: string;
  service: string;
  status: string;
  timestamp: Date;
  description: string;
};
