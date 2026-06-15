// Remediation Engine
import { v4 as uuidv4 } from 'uuid';
import { Remediation, Breach, BreachSeverity } from '../types';
import { breachService } from './breachService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export class RemediationEngine {
  private remediations: Map<string, Remediation> = new Map();
  private rules: Map<BreachSeverity, Array<(breach: Breach) => Promise<string>>> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Trigger remediation for a breach
   */
  async remediate(breachId: string, type: 'auto' | 'manual' | 'semi-auto' = 'auto'): Promise<Remediation> {
    const breach = breachService.getById(breachId);
    const remediation: Remediation = {
      id: uuidv4(),
      breachId,
      action: 'Auto-remediation',
      type,
      status: 'in-progress',
      startedAt: new Date(),
      steps: [],
    };

    this.remediations.set(remediation.id, remediation);
    breachService.updateStatus(breachId, 'remediating');
    eventBus.publish('remediation.started', { breachId, remediationId: remediation.id });

    try {
      const rules = this.rules.get(breach.severity) || [];
      for (const rule of rules) {
        const step = { step: 'Executing rule', status: 'running' as const, timestamp: new Date() };
        remediation.steps.push(step);
        try {
          const result = await rule(breach);
          step.status = 'done';
          step.result = result;
          step.timestamp = new Date();
        } catch (error: any) {
          step.status = 'failed';
          step.result = error.message;
          logger.error(`[RemediationEngine] Rule failed: ${error.message}`);
        }
      }

      remediation.status = 'completed';
      remediation.completedAt = new Date();
      remediation.result = 'Remediation completed successfully';
      breachService.updateStatus(breachId, 'resolved');

      eventBus.publish('remediation.completed', { breachId, remediationId: remediation.id, result: remediation.result });
    } catch (error: any) {
      remediation.status = 'failed';
      remediation.completedAt = new Date();
      remediation.result = error.message;
      logger.error(`[RemediationEngine] Remediation failed: ${error.message}`);
    }

    return remediation;
  }

  getRemediation(id: string): Remediation | undefined { return this.remediations.get(id); }
  getRemediationsForBreach(breachId: string): Remediation[] {
    return Array.from(this.remediations.values()).filter(r => r.breachId === breachId);
  }
  getAllRemediations(): Remediation[] { return Array.from(this.remediations.values()); }

  private registerDefaultRules(): void {
    // Critical: page on-call
    this.rules.set('critical', [
      async (breach) => {
        logger.warn(`[Remediation] CRITICAL: Paging on-call for breach ${breach.id}`);
        eventBus.publish('pagerduty.alert', { breachId: breach.id, severity: 'critical' });
        return 'On-call paged';
      },
      async (breach) => {
        logger.info(`[Remediation] Auto-scaling service ${breach.serviceId}`);
        eventBus.publish('auto.scale', { serviceId: breach.serviceId, reason: 'breach' });
        return 'Auto-scaling triggered';
      },
    ]);

    // High: alert team
    this.rules.set('high', [
      async (breach) => {
        logger.warn(`[Remediation] HIGH: Alerting team for breach ${breach.id}`);
        eventBus.publish('slack.alert', { breachId: breach.id, severity: 'high' });
        return 'Team alerted';
      },
    ]);

    // Medium: log and notify
    this.rules.set('medium', [
      async (breach) => {
        logger.info(`[Remediation] MEDIUM: Logging breach ${breach.id}`);
        return 'Logged for review';
      },
    ]);

    // Low: just log
    this.rules.set('low', [
      async (breach) => {
        logger.debug(`[Remediation] LOW: Tracking breach ${breach.id}`);
        return 'Tracked';
      },
    ]);
  }
}

export const remediationEngine = new RemediationEngine();
export default remediationEngine;
