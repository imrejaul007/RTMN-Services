import { v4 as uuidv4 } from 'uuid';
import { Handoff, HandoffOffer, HandoffRule } from '../models';

export class HandoffService {
  /**
   * Initiate handoff from AI to human
   */
  async initiateHandoff(data: {
    conversationId: string;
    tenantId: string;
    channel: string;
    botId: string;
    flowId: string;
    lastNodeId?: string;
    conversationSummary: string;
    reason: string;
    reasonDescription?: string;
    priority?: string;
    targetTeam?: string;
    targetAgent?: string;
    customerInfo?: { id: string; name: string; phone?: string };
    metadata?: Record<string, any>;
  }): Promise<Handoff> {
    const handoff = new Handoff({
      handoffId: uuidv4(),
      conversationId: data.conversationId,
      tenantId: data.tenantId,
      channel: data.channel,
      aiContext: {
        botId: data.botId,
        flowId: data.flowId,
        lastNodeId: data.lastNodeId,
        conversationSummary: data.conversationSummary
      },
      reason: data.reason,
      reasonDescription: data.reasonDescription,
      priority: data.priority || 'normal',
      targetTeam: data.targetTeam,
      targetAgent: data.targetAgent,
      status: 'pending',
      initiatedAt: new Date(),
      metadata: data.metadata
    });

    await handoff.save();
    return handoff;
  }

  /**
   * Add to queue
   */
  async addToQueue(handoffId: string): Promise<Handoff | null> {
    const handoff = await Handoff.findOne({ handoffId });
    if (!handoff) return null;

    handoff.status = 'in_queue';
    handoff.queuedAt = new Date();
    await handoff.save();

    return handoff;
  }

  /**
   * Get next handoff in queue
   */
  async getNextInQueue(tenantId: string, team?: string): Promise<Handoff | null> {
    const query: any = { tenantId, status: 'in_queue' };
    if (team) query.targetTeam = team;

    return Handoff.findOne(query)
      .sort({ priority: -1, queuedAt: 1 });
  }

  /**
   * Offer to specific agent
   */
  async offerToAgent(
    handoffId: string,
    agentId: string,
    agentName: string,
    team: string,
    offerTimeoutMs: number = 30000
  ): Promise<{ handoff: Handoff; offer: HandoffOffer } | null> {
    const handoff = await Handoff.findOne({ handoffId });
    if (!handoff) return null;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + offerTimeoutMs);

    // Create offer
    const offer = new HandoffOffer({
      offerId: uuidv4(),
      handoffId,
      agentId,
      agentName,
      team,
      offeredAt: now,
      expiresAt,
      status: 'pending'
    });

    await offer.save();

    // Update handoff
    handoff.status = 'offered';
    handoff.offeredAgentId = agentId;
    handoff.assignedAgentName = agentName;
    handoff.offeredAt = now;
    handoff.timeoutAt = expiresAt;
    await handoff.save();

    return { handoff, offer };
  }

  /**
   * Accept handoff offer
   */
  async acceptOffer(offerId: string, agentId: string): Promise<{ handoff: Handoff; offer: HandoffOffer } | null> {
    const offer = await HandoffOffer.findOne({ offerId, agentId, status: 'pending' });
    if (!offer) return null;

    const handoff = await Handoff.findOne({ handoffId: offer.handoffId });
    if (!handoff) return null;

    // Update offer
    offer.status = 'accepted';
    offer.responseAt = new Date();
    await offer.save();

    // Update handoff
    handoff.status = 'accepted';
    handoff.assignedAgentId = agentId;
    handoff.acceptedAt = new Date();
    await handoff.save();

    // Mark other offers as expired
    await HandoffOffer.updateMany(
      { handoffId: offer.handoffId, status: 'pending' },
      { status: 'expired' }
    );

    return { handoff, offer };
  }

  /**
   * Decline handoff offer
   */
  async declineOffer(offerId: string, agentId: string): Promise<HandoffOffer | null> {
    const offer = await HandoffOffer.findOne({ offerId, agentId, status: 'pending' });
    if (!offer) return null;

    offer.status = 'declined';
    offer.responseAt = new Date();
    await offer.save();

    // Reset handoff to queue
    await Handoff.findOneAndUpdate(
      { handoffId: offer.handoffId, status: 'offered' },
      { status: 'in_queue', offeredAgentId: undefined }
    );

    return offer;
  }

  /**
   * Complete handoff (conversation ended with agent)
   */
  async completeHandoff(
    handoffId: string,
    feedback?: { rating?: number; comment?: string; wouldEscalate?: boolean },
    agentNotes?: string
  ): Promise<Handoff | null> {
    const handoff = await Handoff.findOne({ handoffId });
    if (!handoff) return null;

    handoff.status = 'completed';
    handoff.completedAt = new Date();
    if (feedback) handoff.customerFeedback = feedback;
    if (agentNotes) handoff.agentNotes = agentNotes;
    await handoff.save();

    return handoff;
  }

  /**
   * Cancel handoff
   */
  async cancelHandoff(handoffId: string, reason?: string): Promise<Handoff | null> {
    const handoff = await Handoff.findOne({ handoffId });
    if (!handoff) return null;

    handoff.status = 'cancelled';
    handoff.cancelledAt = new Date();
    if (reason) handoff.reasonDescription = reason;
    await handoff.save();

    return handoff;
  }

  /**
   * Handle timeout
   */
  async handleTimeout(handoffId: string): Promise<Handoff | null> {
    const handoff = await Handoff.findOne({ handoffId });
    if (!handoff || handoff.status !== 'offered') return null;

    // Mark all offers as expired
    await HandoffOffer.updateMany(
      { handoffId, status: 'pending' },
      { status: 'expired' }
    );

    // Re-queue or escalate
    handoff.status = 'in_queue';
    handoff.offeredAgentId = undefined;
    handoff.offeredAt = undefined;
    handoff.priority = 'high'; // Escalate priority
    await handoff.save();

    return handoff;
  }

  /**
   * Get handoff by ID
   */
  async getHandoff(handoffId: string): Promise<Handoff | null> {
    return Handoff.findOne({ handoffId });
  }

  /**
   * Get handoff by conversation
   */
  async getHandoffByConversation(conversationId: string): Promise<Handoff | null> {
    return Handoff.findOne({
      conversationId,
      status: { $nin: ['completed', 'cancelled'] }
    });
  }

  /**
   * Get queue for team
   */
  async getQueue(tenantId: string, team?: string): Promise<Handoff[]> {
    const query: any = { tenantId, status: 'in_queue' };
    if (team) query.targetTeam = team;
    return Handoff.find(query).sort({ priority: -1, queuedAt: 1 });
  }

  /**
   * Get queue stats
   */
  async getQueueStats(tenantId: string): Promise<{
    total: number;
    urgent: number;
    avgWaitTime: number;
    byTeam: Record<string, number>;
  }> {
    const queue = await Handoff.find({ tenantId, status: 'in_queue' });

    const byTeam: Record<string, number> = {};
    let urgent = 0;
    let totalWaitTime = 0;

    for (const h of queue) {
      if (h.priority === 'urgent') urgent++;
      totalWaitTime += Date.now() - h.queuedAt!.getTime();

      const team = h.targetTeam || 'general';
      byTeam[team] = (byTeam[team] || 0) + 1;
    }

    return {
      total: queue.length,
      urgent,
      avgWaitTime: queue.length > 0 ? totalWaitTime / queue.length : 0,
      byTeam
    };
  }

  // ============ RULES ============

  /**
   * Evaluate handoff rules
   */
  async evaluateRules(
    tenantId: string,
    context: {
      sentiment?: string;
      intents?: string[];
      silenceDuration?: number;
      complexityScore?: number;
      isBusinessHours?: boolean;
    }
  ): Promise<{ shouldHandoff: boolean; matchedRule?: HandoffRule; action?: any }> {
    const rules = await HandoffRule.find({ tenantId, active: true })
      .sort({ priority: -1 });

    for (const rule of rules) {
      const matches = this.evaluateConditions(rule.conditions, context);
      if (matches) {
        return {
          shouldHandoff: rule.action.type === 'handoff',
          matchedRule: rule,
          action: rule.action
        };
      }
    }

    return { shouldHandoff: false };
  }

  /**
   * Create handoff rule
   */
  async createRule(data: {
    tenantId: string;
    name: string;
    description?: string;
    conditions: any[];
    action: any;
    priority?: number;
  }): Promise<HandoffRule> {
    const rule = new HandoffRule({
      ruleId: uuidv4(),
      ...data,
      active: true
    });
    await rule.save();
    return rule;
  }

  /**
   * Get rules for tenant
   */
  async getRules(tenantId: string): Promise<HandoffRule[]> {
    return HandoffRule.find({ tenantId }).sort({ priority: -1 });
  }

  /**
   * Update rule
   */
  async updateRule(ruleId: string, updates: Partial<HandoffRule>): Promise<HandoffRule | null> {
    return HandoffRule.findOneAndUpdate({ ruleId }, updates, { new: true });
  }

  /**
   * Delete rule
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const result = await HandoffRule.deleteOne({ ruleId });
    return result.deletedCount > 0;
  }

  // ============ ANALYTICS ============

  /**
   * Get analytics
   */
  async getAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any> {
    const handovers = await Handoff.find({
      tenantId,
      initiatedAt: { $gte: startDate, $lte: endDate }
    });

    const completed = handovers.filter((h) => h.status === 'completed');
    const byReason: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    let totalWaitTime = 0;
    let totalHandleTime = 0;
    let totalRating = 0;
    let ratingsCount = 0;

    for (const h of handovers) {
      byReason[h.reason] = (byReason[h.reason] || 0) + 1;
      byPriority[h.priority] = (byPriority[h.priority] || 0) + 1;
      byChannel[h.channel] = (byChannel[h.channel] || 0) + 1;

      if (h.queuedAt && h.acceptedAt) {
        totalWaitTime += h.acceptedAt.getTime() - h.queuedAt.getTime();
      }

      if (h.acceptedAt && h.completedAt) {
        totalHandleTime += h.completedAt.getTime() - h.acceptedAt.getTime();
      }

      if (h.customerFeedback?.rating) {
        totalRating += h.customerFeedback.rating;
        ratingsCount++;
      }
    }

    return {
      tenantId,
      period: { start: startDate, end: endDate },
      overview: {
        totalHandovers: handovers.length,
        completedHandovers: completed.length,
        cancelledHandovers: handovers.filter((h) => h.status === 'cancelled').length,
        avgWaitTime: handovers.length > 0 ? totalWaitTime / handovers.length : 0,
        avgHandleTime: completed.length > 0 ? totalHandleTime / completed.length : 0,
        handoffRate: 1, // Would calculate against total conversations
        deflectionRate: 0.3 // Would calculate against deflected
      },
      byReason,
      byPriority,
      byChannel,
      customerFeedback: {
        avgRating: ratingsCount > 0 ? totalRating / ratingsCount : undefined
      }
    };
  }

  // ============ HELPERS ============

  private evaluateConditions(conditions: any[], context: any): boolean {
    for (const condition of conditions) {
      const value = this.getContextValue(condition.type, context);
      const result = this.compareValues(value, condition.operator, condition.value);
      if (!result) return false;
    }
    return true;
  }

  private getContextValue(type: string, context: any): any {
    switch (type) {
      case 'sentiment':
        return context.sentiment;
      case 'silence':
        return context.silenceDuration;
      case 'complexity':
        return context.complexityScore;
      case 'business_hours':
        return context.isBusinessHours;
      default:
        return context[type];
    }
  }

  private compareValues(value: any, operator: string, compareValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'greater_than':
        return value > compareValue;
      case 'less_than':
        return value < compareValue;
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(value);
      default:
        return false;
    }
  }
}

export const handoffService = new HandoffService();
