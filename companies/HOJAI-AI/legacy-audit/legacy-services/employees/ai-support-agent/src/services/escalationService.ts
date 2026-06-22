/**
 * HOJAI AI Support Agent - Escalation Router Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Intelligent escalation routing based on rules, sentiment, and complexity
 */

import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../utils/logger.js';
import type {
  Escalation,
  EscalationLevel,
  EscalationReason,
  EscalateInput,
  SupportTicket,
} from '../types.js';

const logger = createLogger('escalation-service');

// In-memory escalation storage
const escalations = new Map<string, Escalation>();

/**
 * Escalation team configuration
 */
interface TeamConfig {
  name: string;
  level: EscalationLevel;
  specialties: string[];
  avgHandleTime: number;
  capacity: number;
  currentLoad: number;
}

const TEAM_CONFIG: Record<EscalationLevel, TeamConfig> = {
  level1: {
    name: 'First Response Team',
    level: 'level1',
    specialties: ['general', 'account', 'billing'],
    avgHandleTime: 30,
    capacity: 50,
    currentLoad: 0,
  },
  level2: {
    name: 'Technical Support Team',
    level: 'level2',
    specialties: ['technical', 'product', 'returns'],
    avgHandleTime: 60,
    capacity: 30,
    currentLoad: 0,
  },
  level3: {
    name: 'Senior Support Team',
    level: 'level3',
    specialties: ['complex', 'warranty', 'refund'],
    avgHandleTime: 120,
    capacity: 15,
    currentLoad: 0,
  },
  management: {
    name: 'Management Escalation',
    level: 'management',
    specialties: ['vip', 'legal', 'executive'],
    avgHandleTime: 240,
    capacity: 5,
    currentLoad: 0,
  },
};

/**
 * Escalation rules engine
 */
interface EscalationRule {
  id: string;
  name: string;
  conditions: EscalationCondition[];
  action: EscalationAction;
  priority: number;
  enabled: boolean;
}

interface EscalationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in';
  value: string | number | string[] | boolean;
}

interface EscalationAction {
  targetLevel: EscalationLevel;
  targetTeam?: string;
  addTags?: string[];
  notify?: string[];
  priorityOverride?: 'low' | 'medium' | 'high' | 'urgent';
}

// Default escalation rules
const DEFAULT_ESCALATION_RULES: EscalationRule[] = [
  {
    id: 'rule-sla-breach',
    name: 'SLA Breach Escalation',
    conditions: [
      { field: 'sla.breached', operator: 'equals', value: true },
    ],
    action: {
      targetLevel: 'level2',
      addTags: ['sla-breach', 'urgent'],
      notify: ['team-leader'],
    },
    priority: 1,
    enabled: true,
  },
  {
    id: 'rule-negative-sentiment',
    name: 'Negative Sentiment Escalation',
    conditions: [
      { field: 'sentiment', operator: 'equals', value: 'negative' },
      { field: 'customerTier', operator: 'in', value: ['premium', 'enterprise'] },
    ],
    action: {
      targetLevel: 'level2',
      addTags: ['negative-sentiment', 'vip-customer'],
    },
    priority: 2,
    enabled: true,
  },
  {
    id: 'rule-refund-high-value',
    name: 'High Value Refund Escalation',
    conditions: [
      { field: 'category', operator: 'equals', value: 'refund' },
      { field: 'metadata.amount', operator: 'greater_than', value: 10000 },
    ],
    action: {
      targetLevel: 'level3',
      targetTeam: 'refund-approval',
      addTags: ['high-value-refund', 'approval-required'],
      notify: ['finance-team'],
    },
    priority: 3,
    enabled: true,
  },
  {
    id: 'rule-urgent-priority',
    name: 'Urgent Priority Escalation',
    conditions: [
      { field: 'priority', operator: 'equals', value: 'urgent' },
    ],
    action: {
      targetLevel: 'level2',
      addTags: ['urgent', 'priority-handling'],
      notify: ['team-leader'],
      priorityOverride: 'urgent',
    },
    priority: 4,
    enabled: true,
  },
  {
    id: 'rule-enterprise-customer',
    name: 'Enterprise Customer Escalation',
    conditions: [
      { field: 'customerTier', operator: 'equals', value: 'enterprise' },
    ],
    action: {
      targetLevel: 'level3',
      addTags: ['enterprise-customer'],
    },
    priority: 5,
    enabled: true,
  },
  {
    id: 'rule-repeated-issue',
    name: 'Repeated Issue Escalation',
    conditions: [
      { field: 'relatedTicketIds', operator: 'greater_than', value: 2 },
    ],
    action: {
      targetLevel: 'level3',
      addTags: ['repeated-issue', 'cx-concern'],
    },
    priority: 6,
    enabled: true,
  },
  {
    id: 'rule-vip-customer',
    name: 'VIP Customer Escalation',
    conditions: [
      { field: 'metadata.isVIP', operator: 'equals', value: true },
    ],
    action: {
      targetLevel: 'level3',
      addTags: ['vip', 'executive-attention'],
      notify: ['account-manager'],
    },
    priority: 7,
    enabled: true,
  },
];

const escalationRules = new Map<string, EscalationRule>(
  DEFAULT_ESCALATION_RULES.map(rule => [rule.id, rule])
);

/**
 * Determine appropriate escalation level based on ticket analysis
 */
export async function determineEscalationLevel(
  ticket: SupportTicket
): Promise<{ level: EscalationLevel; reason: EscalationReason; notes?: string }> {
  logger.info('determine_escalation', { ticketId: ticket.id, status: ticket.status });

  // Check escalation rules
  for (const rule of Array.from(escalationRules.values())
    .filter(r => r.enabled)
    .sort((a, b) => a.priority - b.priority)) {

    const conditionsMet = rule.conditions.every(condition => {
      const ticketValue = getNestedValue(ticket as unknown as Record<string, unknown>, condition.field);

      switch (condition.operator) {
        case 'equals':
          return ticketValue === condition.value;
        case 'contains':
          return typeof ticketValue === 'string' && ticketValue.includes(condition.value as string);
        case 'greater_than':
          return typeof ticketValue === 'number' && ticketValue > (condition.value as number);
        case 'less_than':
          return typeof ticketValue === 'number' && ticketValue < (condition.value as number);
        case 'in':
          return Array.isArray(condition.value) && condition.value.includes(ticketValue as string);
        default:
          return false;
      }
    });

    if (conditionsMet) {
      logger.info('escalation_rule_matched', {
        ticketId: ticket.id,
        ruleId: rule.id,
        ruleName: rule.name,
      });

      return {
        level: rule.action.targetLevel,
        reason: determineReasonFromRule(rule),
        notes: `Matched rule: ${rule.name}`,
      };
    }
  }

  // Default escalation based on ticket state
  if (ticket.priority === 'urgent') {
    return { level: 'level2', reason: 'priority_upgrade' };
  }

  if (ticket.sla?.breached) {
    return { level: 'level2', reason: 'sla_breach', notes: 'SLA breach detected' };
  }

  // Default to level1 for most cases
  return { level: 'level1', reason: 'customer_request' };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * Determine escalation reason from rule
 */
function determineReasonFromRule(rule: EscalationRule): EscalationReason {
  switch (rule.id) {
    case 'rule-sla-breach':
      return 'sla_breach';
    case 'rule-negative-sentiment':
      return 'sentiment_negative';
    case 'rule-refund-high-value':
      return 'refund_exceeds_limit';
    case 'rule-urgent-priority':
      return 'priority_upgrade';
    case 'rule-enterprise-customer':
      return 'complex_issue';
    case 'rule-repeated-issue':
      return 'repeated_issue';
    case 'rule-vip-customer':
      return 'management_review';
    default:
      return 'customer_request';
  }
}

/**
 * Get team for escalation level
 */
function getTeamForLevel(level: EscalationLevel): TeamConfig {
  return TEAM_CONFIG[level];
}

/**
 * Get least loaded team at level
 */
function getAvailableAgent(level: EscalationLevel): { agentId: string; agentName: string } | null {
  const team = TEAM_CONFIG[level];

  if (team.currentLoad >= team.capacity) {
    // Try lower levels
    if (level === 'level3') {
      return getAvailableAgent('level2') || getAvailableAgent('level1');
    }
    if (level === 'level2') {
      return getAvailableAgent('level1');
    }
    return null;
  }

  // Simulate agent assignment
  const agentNames: Record<EscalationLevel, string[]> = {
    level1: ['Agent Alice', 'Agent Bob', 'Agent Carol'],
    level2: ['Tech Lead Dave', 'Tech Sarah'],
    level3: ['Senior Mike', 'Senior Emma'],
    management: ['Manager John', 'Director Lisa'],
  };

  const agents = agentNames[level];
  const agentIndex = team.currentLoad % agents.length;

  return {
    agentId: `agent_${level}_${agentIndex}`,
    agentName: agents[agentIndex],
  };
}

/**
 * Create escalation record
 */
export async function createEscalation(
  input: EscalateInput,
  escalatedBy: string
): Promise<Escalation> {
  logger.info('create_escalation', { ticketId: input.ticketId, reason: input.reason });

  const id = uuidv4();
  const level = input.targetLevel || 'level1';
  const team = getTeamForLevel(level);
  const agent = getAvailableAgent(level);

  const escalation: Escalation = {
    id,
    ticketId: input.ticketId,
    fromLevel: 'level1', // Assuming initial level
    toLevel: level,
    targetTeam: input.targetTeam || team.name,
    targetAgentId: agent?.agentId,
    targetAgentName: agent?.agentName,
    reason: input.reason,
    notes: input.notes,
    escalatedBy,
    escalatedAt: new Date().toISOString(),
    status: 'pending',
  };

  escalations.set(id, escalation);

  // Update team load
  if (agent) {
    team.currentLoad++;
  }

  logger.info('escalation_created', {
    escalationId: id,
    ticketId: input.ticketId,
    targetLevel: level,
    targetAgent: agent?.agentName,
  });

  return escalation;
}

/**
 * Get escalation by ID
 */
export async function getEscalationById(escalationId: string): Promise<Escalation | null> {
  return escalations.get(escalationId) || null;
}

/**
 * Get escalations for ticket
 */
export async function getEscalationsForTicket(ticketId: string): Promise<Escalation[]> {
  const ticketEscalations: Escalation[] = [];

  for (const escalation of escalations.values()) {
    if (escalation.ticketId === ticketId) {
      ticketEscalations.push(escalation);
    }
  }

  return ticketEscalations.sort(
    (a, b) => new Date(b.escalatedAt).getTime() - new Date(a.escalatedAt).getTime()
  );
}

/**
 * Accept escalation
 */
export async function acceptEscalation(
  escalationId: string,
  agentId: string
): Promise<Escalation | null> {
  const escalation = escalations.get(escalationId);
  if (!escalation) {
    logger.warn('escalation_not_found', { escalationId });
    return null;
  }

  escalation.status = 'accepted';
  escalation.targetAgentId = agentId;

  // Update team config
  const team = TEAM_CONFIG[escalation.toLevel];
  if (agentId.includes(`agent_${escalation.toLevel}`)) {
    team.currentLoad++;
  }

  logger.info('escalation_accepted', { escalationId, agentId });

  return escalation;
}

/**
 * Resolve escalation
 */
export async function resolveEscalation(escalationId: string): Promise<Escalation | null> {
  const escalation = escalations.get(escalationId);
  if (!escalation) {
    logger.warn('escalation_not_found', { escalationId });
    return null;
  }

  escalation.status = 'resolved';
  escalation.resolvedAt = new Date().toISOString();

  // Decrement team load
  const team = TEAM_CONFIG[escalation.toLevel];
  if (team.currentLoad > 0) {
    team.currentLoad--;
  }

  logger.info('escalation_resolved', { escalationId });

  return escalation;
}

/**
 * Reject escalation
 */
export async function rejectEscalation(
  escalationId: string,
  reason: string
): Promise<Escalation | null> {
  const escalation = escalations.get(escalationId);
  if (!escalation) {
    logger.warn('escalation_not_found', { escalationId });
    return null;
  }

  escalation.status = 'rejected';
  escalation.notes = `${escalation.notes || ''}\nRejection reason: ${reason}`;

  logger.info('escalation_rejected', { escalationId, reason });

  return escalation;
}

/**
 * Get team statistics
 */
export async function getTeamStats(): Promise<{
  teams: Record<EscalationLevel, { name: string; currentLoad: number; capacity: number; avgHandleTime: number }>;
  totalActiveEscalations: number;
  pendingEscalations: number;
}> {
  const teams: Record<EscalationLevel, { name: string; currentLoad: number; capacity: number; avgHandleTime: number }> = {
    level1: { name: '', currentLoad: 0, capacity: 0, avgHandleTime: 0 },
    level2: { name: '', currentLoad: 0, capacity: 0, avgHandleTime: 0 },
    level3: { name: '', currentLoad: 0, capacity: 0, avgHandleTime: 0 },
    management: { name: '', currentLoad: 0, capacity: 0, avgHandleTime: 0 },
  };

  for (const [level, config] of Object.entries(TEAM_CONFIG)) {
    teams[level as EscalationLevel] = {
      name: config.name,
      currentLoad: config.currentLoad,
      capacity: config.capacity,
      avgHandleTime: config.avgHandleTime,
    };
  }

  let totalActive = 0;
  let pending = 0;

  for (const escalation of escalations.values()) {
    if (escalation.status === 'pending' || escalation.status === 'accepted') {
      totalActive++;
    }
    if (escalation.status === 'pending') {
      pending++;
    }
  }

  return {
    teams,
    totalActiveEscalations: totalActive,
    pendingEscalations: pending,
  };
}

/**
 * Get escalation rules
 */
export async function getEscalationRules(): Promise<EscalationRule[]> {
  return Array.from(escalationRules.values());
}

/**
 * Update escalation rule
 */
export async function updateEscalationRule(
  ruleId: string,
  updates: Partial<EscalationRule>
): Promise<EscalationRule | null> {
  const rule = escalationRules.get(ruleId);
  if (!rule) {
    logger.warn('escalation_rule_not_found', { ruleId });
    return null;
  }

  Object.assign(rule, updates);
  logger.info('escalation_rule_updated', { ruleId });

  return rule;
}

/**
 * Enable/disable escalation rule
 */
export async function toggleEscalationRule(
  ruleId: string,
  enabled: boolean
): Promise<EscalationRule | null> {
  const rule = escalationRules.get(ruleId);
  if (!rule) {
    logger.warn('escalation_rule_not_found', { ruleId });
    return null;
  }

  rule.enabled = enabled;
  logger.info('escalation_rule_toggled', { ruleId, enabled });

  return rule;
}
