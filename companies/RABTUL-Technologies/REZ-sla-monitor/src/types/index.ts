export type SLASeverity = 'low' | 'medium' | 'high' | 'critical';
export type SLAStatus = 'active' | 'paused' | 'breached' | 'met' | 'expired';
export type MetricType = 'uptime' | 'latency' | 'throughput' | 'error_rate' | 'response_time' | 'availability';

export interface SLATarget {
  metric: MetricType;
  threshold: number;
  comparator: 'gte' | 'lte' | 'eq' | 'between';
  unit: string;
  windowMs?: number; // Time window for evaluation
  upperBound?: number; // For 'between' comparator
}

export interface SLA {
  id: string;
  name: string;
  description: string;
  serviceId: string;
  provider: string;
  consumer: string;
  targets: SLATarget[];
  status: SLAStatus;
  startDate: Date;
  endDate: Date;
  penalty?: { type: 'credit' | 'refund' | 'fix'; amount?: number; description?: string };
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SLAMeasurement {
  id: string;
  slaId: string;
  metric: MetricType;
  value: number;
  unit: string;
  measuredAt: Date;
  source: string;
  withinTarget: boolean;
  notes?: string;
}

export interface SLAReport {
  id: string;
  slaId: string;
  period: { start: Date; end: Date };
  compliance: number; // 0-100
  measurements: number;
  breaches: number;
  byMetric: Record<string, { compliance: number; measurements: number; breaches: number }>;
  generatedAt: Date;
}

export interface SLABreach {
  id: string;
  slaId: string;
  metric: MetricType;
  expectedValue: number;
  actualValue: number;
  severity: SLASeverity;
  detectedAt: Date;
  resolvedAt?: Date;
  resolved: boolean;
  description: string;
}
