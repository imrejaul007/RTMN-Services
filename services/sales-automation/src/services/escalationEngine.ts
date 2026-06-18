import { store, Escalation, EscalationRule, EscalationLevel, EscalationStatus } from '../models/Automation';

export interface EscalationResult {
  success: boolean;
  escalationId: string;
  level: EscalationLevel;
  action: string;
  message: string;
}

export class EscalationEngine {
  private intervalId: NodeJS.Timeout | null = null;
  private processing: boolean = false;

  start(intervalMs: number = 30000): void {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.checkPendingEscalations().catch(console.error);
    }, intervalMs);

    console.log('Escalation engine started');
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Escalation engine stopped');
    }
  }

  async checkPendingEscalations(): Promise<EscalationResult[]> {
    if (this.processing) {
      return [];
    }

    this.processing = true;
    const results: EscalationResult[] = [];

    try {
      const pendingEscalations = store.getPendingEscalations();
      const rules = store.getAllEscalationRules().filter(r => r.active);

      for (const escalation of pendingEscalations) {
        const rule = escalation.ruleId
          ? store.getEscalationRule(escalation.ruleId)
          : rules[0];

        if (rule) {
          const result = await this.processEscalation(escalation, rule);
          results.push(result);
        }
      }
    } finally {
      this.processing = false;
    }

    return results;
  }

  async processEscalation(escalation: Escalation, rule: EscalationRule): Promise<EscalationResult> {
    const currentLevelConfig = rule.escalationLevels.find(
      l => l.level === escalation.currentLevel
    );

    if (!currentLevelConfig) {
      return {
        success: false,
        escalationId: escalation.id,
        level: escalation.currentLevel,
        action: 'none',
        message: `No configuration for escalation level ${escalation.currentLevel}`
      };
    }

    // Update escalation status
    store.updateEscalation(escalation.id, {
      status: 'in_progress',
      history: [
        ...escalation.history,
        {
          level: escalation.currentLevel,
          action: 'notified',
          timestamp: new Date(),
          notes: `Notified via ${currentLevelConfig.notifyChannels.join(', ')}`
        }
      ]
    });

    // Trigger notifications (simulated)
    await this.sendNotifications(escalation, currentLevelConfig);

    // Check if should auto-escalate
    if (currentLevelConfig.autoEscalate && escalation.currentLevel < rule.escalationLevels.length) {
      setTimeout(() => {
        this.autoEscalate(escalation.id).catch(console.error);
      }, currentLevelConfig.responseTimeMinutes * 60 * 1000);
    }

    return {
      success: true,
      escalationId: escalation.id,
      level: escalation.currentLevel,
      action: 'notified',
      message: `Escalation ${escalation.id} at level ${escalation.currentLevel} notified`
    };
  }

  private async sendNotifications(
    escalation: Escalation,
    levelConfig: any
  ): Promise<void> {
    // Simulate sending notifications
    for (const channel of levelConfig.notifyChannels) {
      console.log(`[${channel}] Escalation alert for lead ${escalation.leadId} at level ${escalation.currentLevel}`);
    }
  }

  async autoEscalate(escalationId: string): Promise<EscalationResult> {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      throw new Error('Escalation not found');
    }

    const maxLevels = parseInt(process.env.ESCALATION_MAX_LEVELS || '4');
    if (escalation.currentLevel >= maxLevels) {
      return {
        success: false,
        escalationId,
        level: escalation.currentLevel,
        action: 'max_level',
        message: 'Maximum escalation level reached'
      };
    }

    const newLevel = (escalation.currentLevel + 1) as EscalationLevel;

    store.updateEscalation(escalationId, {
      currentLevel: newLevel,
      history: [
        ...escalation.history,
        {
          level: newLevel,
          action: 'escalated',
          timestamp: new Date(),
          notes: 'Auto-escalated to next level'
        }
      ]
    });

    return {
      success: true,
      escalationId,
      level: newLevel,
      action: 'escalated',
      message: `Escalation ${escalationId} auto-escalated to level ${newLevel}`
    };
  }

  async triggerEscalation(
    leadId: string,
    dealId?: string,
    ruleId?: string,
    metadata?: Record<string, any>
  ): Promise<Escalation> {
    const escalation = store.createEscalation({
      ruleId,
      leadId,
      dealId,
      currentLevel: 1,
      metadata
    });

    // Process the new escalation
    if (ruleId) {
      const rule = store.getEscalationRule(ruleId);
      if (rule) {
        await this.processEscalation(escalation, rule);
      }
    }

    return escalation;
  }

  async resolveEscalation(
    escalationId: string,
    notes?: string,
    actor?: string
  ): Promise<Escalation | undefined> {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      return undefined;
    }

    return store.updateEscalation(escalationId, {
      status: 'resolved',
      resolvedAt: new Date(),
      notes: [...escalation.notes, ...(notes ? [notes] : [])],
      history: [
        ...escalation.history,
        {
          level: escalation.currentLevel,
          action: 'resolved',
          timestamp: new Date(),
          actor,
          notes
        }
      ]
    });
  }

  async cancelEscalation(escalationId: string, reason?: string): Promise<Escalation | undefined> {
    const escalation = store.getEscalation(escalationId);
    if (!escalation) {
      return undefined;
    }

    return store.updateEscalation(escalationId, {
      status: 'cancelled',
      notes: [...escalation.notes, ...(reason ? [`Cancelled: ${reason}`] : [])],
      history: [
        ...escalation.history,
        {
          level: escalation.currentLevel,
          action: 'resolved',
          timestamp: new Date(),
          notes: reason ? `Cancelled: ${reason}` : 'Escalation cancelled'
        }
      ]
    });
  }

  getEscalationStats() {
    const escalations = store.getAllEscalations();
    const rules = store.getAllEscalationRules();

    const resolved = escalations.filter(e => e.status === 'resolved');
    const avgResolutionTime = resolved.length > 0
      ? resolved.reduce((sum, e) => {
          const diff = e.resolvedAt ? e.resolvedAt.getTime() - e.triggeredAt.getTime() : 0;
          return sum + diff;
        }, 0) / resolved.length / 60000 // Convert to minutes
      : 0;

    return {
      escalations: {
        total: escalations.length,
        pending: escalations.filter(e => e.status === 'pending' || e.status === 'in_progress').length,
        resolved: resolved.length,
        cancelled: escalations.filter(e => e.status === 'cancelled').length
      },
      rules: {
        total: rules.length,
        active: rules.filter(r => r.active).length,
        byTriggerType: {
          response_time: rules.filter(r => r.triggerType === 'response_time').length,
          sla_breach: rules.filter(r => r.triggerType === 'sla_breach').length,
          priority: rules.filter(r => r.triggerType === 'priority').length,
          manual: rules.filter(r => r.triggerType === 'manual').length,
          condition: rules.filter(r => r.triggerType === 'condition').length
        }
      },
      avgResolutionTimeMinutes: Math.round(avgResolutionTime)
    };
  }
}
