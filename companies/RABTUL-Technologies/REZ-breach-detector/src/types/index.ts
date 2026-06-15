export type BreachSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BreachStatus = 'detected' | 'acknowledged' | 'remediating' | 'resolved' | 'false-positive';
export type BreachType = 'threshold' | 'anomaly' | 'pattern' | 'sustained' | 'spike' | 'degradation';

export interface Breach {
  id: string;
  slaId: string;
  serviceId: string;
  type: BreachType;
  metric: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  severity: BreachSeverity;
  status: BreachStatus;
  description: string;
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  incidentId?: string;
  metadata: Record<string, any>;
}

export interface BreachEvent {
  id: string;
  breachId: string;
  eventType: 'detected' | 'acknowledged' | 'remediation-started' | 'remediation-completed' | 'resolved' | 'escalated';
  message: string;
  data?: Record<string, any>;
  actor?: string;
  timestamp: Date;
}

export interface Remediation {
  id: string;
  breachId: string;
  action: string;
  type: 'auto' | 'manual' | 'semi-auto';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: string;
  startedAt: Date;
  completedAt?: Date;
  steps: Array<{ step: string; status: 'pending' | 'running' | 'done' | 'failed'; result?: string; timestamp: Date }>;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: BreachSeverity;
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'closed';
  breachIds: string[];
  affectedServices: string[];
  assignee?: string;
  createdAt: Date;
  resolvedAt?: Date;
  timeline: Array<{ timestamp: Date; event: string; actor?: string }>;
}
