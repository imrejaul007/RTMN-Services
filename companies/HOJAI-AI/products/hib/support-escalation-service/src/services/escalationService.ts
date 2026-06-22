/**
 * Escalation Service - Business logic for escalation operations
 */

import { v4 as uuidv4 } from 'uuid';
import { Escalation, IEscalation, EscalationLevel, EscalationReason, EscalationStatus } from '../models/Escalation';
import { History, IHistory } from '../models/History';
import { Rule, IRule, RuleConditionType, IRuleCondition } from '../models/Rule';
import logger from '../utils/logger';

export interface CreateEscalationInput {
  ticketId: string;
  targetLevel: EscalationLevel;
  reason: EscalationReason;
  triggeredBy: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface EscalationFilter {
  status?: EscalationStatus;
  ticketId?: string;
  currentLevel?: EscalationLevel;
  assignedTo?: string;
  assignedTeam?: string;
}

export class EscalationService {
  /**
   * Create a new escalation
   */
  async createEscalation(input: CreateEscalationInput): Promise<IEscalation> {
    // Determine current level from any existing escalations
    const existingEscalation = await Escalation.findOne({
      ticketId: input.ticketId,
      status: { $in: [EscalationStatus.PENDING, EscalationStatus.IN_PROGRESS] },
    }).sort({ escalatedAt: -1 }).exec();

    const currentLevel = existingEscalation
      ? this.getNextLevel(existingEscalation.targetLevel)
      : EscalationLevel.LEVEL_1;

    const escalationData: Partial<IEscalation> = {
      escalationId: `ESC-${uuidv4().slice(0, 8).toUpperCase()}`,
      ticketId: input.ticketId,
      currentLevel,
      targetLevel: input.targetLevel,
      reason: input.reason,
      status: EscalationStatus.PENDING,
      triggeredBy: input.triggeredBy,
      notes: input.notes || '',
      metadata: input.metadata || {},
      escalatedAt: new Date(),
    };

    const escalation = new Escalation(escalationData);
    await escalation.save();

    // Create history record
    await this.createHistoryRecord({
      escalationId: escalation.escalationId,
      ticketId: input.ticketId,
      fromLevel: currentLevel,
      toLevel: input.targetLevel,
      reason: input.reason,
      status: EscalationStatus.PENDING,
      changedBy: input.triggeredBy,
      notes: input.notes || '',
      metadata: input.metadata || {},
    });

    logger.info('Escalation created', { escalationId: escalation.escalationId, ticketId: input.ticketId });
    return escalation;
  }

  /**
   * Get escalation by ID
   */
  async getEscalationById(escalationId: string): Promise<IEscalation | null> {
    return Escalation.findOne({ escalationId }).exec();
  }

  /**
   * Get escalations with filters
   */
  async getEscalations(
    filter: EscalationFilter,
    page = 1,
    limit = 20
  ): Promise<{ escalations: IEscalation[]; total: number; page: number; totalPages: number }> {
    const query: Record<string, unknown> = {};

    if (filter.status) query.status = filter.status;
    if (filter.ticketId) query.ticketId = filter.ticketId;
    if (filter.currentLevel) query.currentLevel = filter.currentLevel;
    if (filter.assignedTo) query.assignedTo = filter.assignedTo;
    if (filter.assignedTeam) query.assignedTeam = filter.assignedTeam;

    const skip = (page - 1) * limit;
    const [escalations, total] = await Promise.all([
      Escalation.find(query).sort({ escalatedAt: -1 }).skip(skip).limit(limit).exec(),
      Escalation.countDocuments(query).exec(),
    ]);

    return {
      escalations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Escalate ticket to next level
   */
  async escalate(
    escalationId: string,
    targetLevel: EscalationLevel,
    escalatedBy: string,
    notes?: string,
    assignedTo?: string,
    assignedTeam?: string
  ): Promise<IEscalation | null> {
    const escalation = await Escalation.findOne({ escalationId }).exec();
    if (!escalation) return null;

    const previousLevel = escalation.currentLevel;

    escalation.currentLevel = targetLevel;
    escalation.status = EscalationStatus.IN_PROGRESS;
    if (assignedTo) escalation.assignedTo = assignedTo;
    if (assignedTeam) escalation.assignedTeam = assignedTeam;
    if (notes) escalation.notes = notes;

    await escalation.save();

    // Create history record
    await this.createHistoryRecord({
      escalationId,
      ticketId: escalation.ticketId,
      fromLevel: previousLevel,
      toLevel: targetLevel,
      reason: EscalationReason.MANUAL,
      status: EscalationStatus.IN_PROGRESS,
      changedBy: escalatedBy,
      notes: notes || '',
    });

    logger.info('Ticket escalated', { escalationId, fromLevel: previousLevel, toLevel: targetLevel });
    return escalation;
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(escalationId: string, resolvedBy: string, notes?: string): Promise<IEscalation | null> {
    const escalation = await Escalation.findOneAndUpdate(
      { escalationId },
      {
        $set: {
          status: EscalationStatus.RESOLVED,
          resolvedAt: new Date(),
          notes: notes || '',
        },
      },
      { new: true }
    ).exec();

    if (escalation) {
      await this.createHistoryRecord({
        escalationId,
        ticketId: escalation.ticketId,
        fromLevel: escalation.currentLevel,
        toLevel: escalation.currentLevel,
        reason: EscalationReason.MANUAL,
        status: EscalationStatus.RESOLVED,
        changedBy: resolvedBy,
        notes: notes || '',
      });

      logger.info('Escalation resolved', { escalationId });
    }
    return escalation;
  }

  /**
   * Cancel escalation
   */
  async cancelEscalation(escalationId: string, cancelledBy: string, reason?: string): Promise<IEscalation | null> {
    const escalation = await Escalation.findOneAndUpdate(
      { escalationId },
      {
        $set: {
          status: EscalationStatus.CANCELLED,
          notes: reason || '',
        },
      },
      { new: true }
    ).exec();

    if (escalation) {
      await this.createHistoryRecord({
        escalationId,
        ticketId: escalation.ticketId,
        fromLevel: escalation.currentLevel,
        toLevel: escalation.currentLevel,
        reason: EscalationReason.MANUAL,
        status: EscalationStatus.CANCELLED,
        changedBy: cancelledBy,
        notes: reason || '',
      });

      logger.info('Escalation cancelled', { escalationId });
    }
    return escalation;
  }

  /**
   * Get escalation history
   */
  async getEscalationHistory(escalationId: string): Promise<IHistory[]> {
    return History.find({ escalationId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Get ticket escalation history
   */
  async getTicketEscalationHistory(ticketId: string): Promise<IHistory[]> {
    return History.find({ ticketId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Evaluate rules and trigger escalations
   */
  async evaluateAndEscalate(
    ticketData: {
      ticketId: string;
      priority: string;
      category: string;
      status: string;
      customerTier?: string;
      assigneeWorkload?: number;
      subject?: string;
      description?: string;
    }
  ): Promise<IEscalation[]> {
    const rules = await Rule.find({ isActive: true }).sort({ priority: -1 }).exec();
    const triggeredEscalations: IEscalation[] = [];

    for (const rule of rules) {
      if (this.evaluateRule(rule, ticketData)) {
        // Check cooldown
        if (rule.lastTriggeredAt) {
          const cooldownMs = rule.cooldownMinutes * 60 * 1000;
          if (Date.now() - rule.lastTriggeredAt.getTime() < cooldownMs) {
            continue;
          }
        }

        const escalation = await this.createEscalation({
          ticketId: ticketData.ticketId,
          targetLevel: rule.escalationLevel as EscalationLevel,
          reason: EscalationReason.MANUAL,
          triggeredBy: 'system',
          notes: `Auto-triggered by rule: ${rule.name}`,
        });

        // Execute actions
        for (const action of rule.actions) {
          await this.executeAction(action, escalation);
        }

        // Update rule trigger count
        rule.lastTriggeredAt = new Date();
        rule.triggerCount += 1;
        await rule.save();

        triggeredEscalations.push(escalation);
      }
    }

    return triggeredEscalations;
  }

  /**
   * Get next escalation level
   */
  private getNextLevel(currentLevel: EscalationLevel): EscalationLevel {
    const levels = Object.values(EscalationLevel);
    const currentIndex = levels.indexOf(currentLevel);
    if (currentIndex === -1 || currentIndex >= levels.length - 1) {
      return EscalationLevel.EXECUTIVE;
    }
    return levels[currentIndex + 1];
  }

  /**
   * Create history record
   */
  private async createHistoryRecord(data: {
    escalationId: string;
    ticketId: string;
    fromLevel: EscalationLevel;
    toLevel: EscalationLevel;
    reason: EscalationReason;
    status: EscalationStatus;
    changedBy: string;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<IHistory> {
    const history = new History({
      historyId: `HST-${uuidv4().slice(0, 8).toUpperCase()}`,
      ...data,
      metadata: data.metadata || {},
    });
    await history.save();
    return history;
  }

  /**
   * Evaluate if rule matches ticket data
   */
  private evaluateRule(rule: IRule, ticketData: Record<string, unknown>): boolean {
    const results = rule.conditions.map(condition => this.evaluateCondition(condition, ticketData));

    if (rule.conditionLogic === 'AND') {
      return results.every(r => r);
    }
    return results.some(r => r);
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(condition: IRuleCondition, ticketData: Record<string, unknown>): boolean {
    const value = ticketData[condition.type];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Execute rule action
   */
  private async executeAction(action: { type: string; value: string }, escalation: IEscalation): Promise<void> {
    // Action execution would integrate with external services
    logger.info('Executing action', { action: action.type, value: action.value, escalationId: escalation.escalationId });
  }
}

export const escalationService = new EscalationService();
export default escalationService;