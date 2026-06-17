export type Priority = 'critical' | 'high' | 'medium' | 'low';
export type Status = 'open' | 'in_progress' | 'auto_resolved' | 'resolved' | 'escalated' | 'closed';
export type ResolutionMethod = 'auto' | 'manual' | 'kb' | 'ai' | 'escalated';

export interface SLAConfig {
  critical: number; // hours
  high: number;
  medium: number;
  low: number;
}

export interface ResolutionTemplate {
  id: string;
  name: string;
  keywords: string[];
  title: string;
  solution: string;
  steps: string[];
  confidence: number;
  priority: Priority;
}

export interface EscalationRule {
  id: string;
  trigger: 'sla_breach' | 'customer_level' | 'priority' | 'category';
  threshold: number | string;
  escalationLevel: number;
  assignTo: string; // agent_id or team
  notify: string[];
}

export interface AgentAssignment {
  agentId: string;
  agentName: string;
  team: string;
  skills: string[];
  workload: number;
  assignedAt: Date;
}

export interface Resolution {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  customerId: string;
  customerTier?: 'basic' | 'premium' | 'enterprise';

  // Resolution details
  resolutionMethod?: ResolutionMethod;
  resolutionTemplateId?: string;
  resolution?: string;
  steps?: string[];
  confidence?: number;

  // Agent assignment
  assignedAgent?: AgentAssignment;
  escalatedTo?: string;

  // SLA tracking
  slaConfig: SLAConfig;
  slaBreached: boolean;
  slaBreachTime?: Date;
  slaResponseDeadline?: Date;
  slaResolutionDeadline?: Date;

  // Escalation
  escalationCount: number;
  escalationHistory: Array<{
    escalatedAt: Date;
    escalatedTo: string;
    reason: string;
    previousPriority?: Priority;
    newPriority?: Priority;
  }>;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;

  // Tags and metadata
  tags: string[];
  metadata: Record<string, any>;
}

export interface CreateResolutionRequest {
  ticketId: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  customerId: string;
  customerTier?: 'basic' | 'premium' | 'enterprise';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateResolutionRequest {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  status?: Status;
  assignedAgent?: AgentAssignment;
  resolution?: string;
  steps?: string[];
  resolutionMethod?: ResolutionMethod;
  slaConfig?: Partial<SLAConfig>;
}

// In-memory storage (replace with database in production)
export const resolutionStore: Map<string, Resolution> = new Map();
export const resolutionTemplates: Map<string, ResolutionTemplate> = new Map();
export const escalationRules: Map<string, EscalationRule> = new Map();

// Default templates
const defaultTemplates: ResolutionTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Password Reset',
    keywords: ['password', 'reset', 'forgot', 'login', 'account access'],
    title: 'Password Reset Request',
    solution: 'Password has been reset successfully. User should check email for temporary password.',
    steps: ['Verify customer identity', 'Generate temporary password', 'Send password via email', 'Request password change on next login'],
    confidence: 0.95,
    priority: 'medium'
  },
  {
    id: 'tpl-002',
    name: 'Billing Inquiry',
    keywords: ['billing', 'invoice', 'charge', 'payment', 'subscription'],
    title: 'Billing Question',
    solution: 'Billing information provided to customer.',
    steps: ['Access billing records', 'Review transaction history', 'Explain charges', 'Provide invoice if requested'],
    confidence: 0.90,
    priority: 'low'
  },
  {
    id: 'tpl-003',
    name: 'Service Outage',
    keywords: ['down', 'outage', 'not working', 'error', 'cannot access', 'unavailable'],
    title: 'Service Availability Issue',
    solution: 'Service status checked. If outage confirmed, engineering team notified.',
    steps: ['Check service status dashboard', 'Verify customer location/connection', 'Check for known outages', 'Escalate to engineering if needed'],
    confidence: 0.85,
    priority: 'critical'
  },
  {
    id: 'tpl-004',
    name: 'Feature Request',
    keywords: ['feature', 'request', 'suggestion', 'enhancement', 'would be nice'],
    title: 'Feature Request Logged',
    solution: 'Feature request has been logged for product team review.',
    steps: ['Log feature request', 'Categorize request type', 'Add to product backlog', 'Notify customer of tracking ID'],
    confidence: 0.95,
    priority: 'low'
  }
];

defaultTemplates.forEach(tpl => resolutionTemplates.set(tpl.id, tpl));

// Default escalation rules
const defaultEscalationRules: EscalationRule[] = [
  {
    id: 'esc-001',
    trigger: 'priority',
    threshold: 'critical',
    escalationLevel: 1,
    assignTo: 'tier3-support',
    notify: ['manager', 'director']
  },
  {
    id: 'esc-002',
    trigger: 'sla_breach',
    threshold: 1,
    escalationLevel: 1,
    assignTo: 'senior-agent',
    notify: ['team-lead']
  },
  {
    id: 'esc-003',
    trigger: 'customer_level',
    threshold: 'enterprise',
    escalationLevel: 2,
    assignTo: 'dedicated-support',
    notify: ['account-manager', 'director']
  }
];

defaultEscalationRules.forEach(rule => escalationRules.set(rule.id, rule));
