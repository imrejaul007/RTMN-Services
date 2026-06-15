// Alert Manager
import { v4 as uuidv4 } from 'uuid';
import { SLABreach, SLASeverity, MetricType } from '../types';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';
import { thresholdChecker } from './thresholdChecker';
import { slaService } from './slaService';

export class AlertManager {
  private alerts: Map<string, SLABreach> = new Map();
  private alertHandlers: Map<SLASeverity, Array<(alert: SLABreach) => void>> = new Map();

  registerHandler(severity: SLASeverity, handler: (alert: SLABreach) => void): void {
    if (!this.alertHandlers.has(severity)) this.alertHandlers.set(severity, []);
    this.alertHandlers.get(severity)!.push(handler);
  }

  checkAndAlert(slaId: string): SLABreach[] {
    const result = thresholdChecker.checkSLA(slaId);
    if (result.compliant) return [];
    const newAlerts: SLABreach[] = [];

    for (const violation of result.violations) {
      const severity = this.calculateSeverity(violation);
      const breach: SLABreach = {
        id: uuidv4(),
        slaId,
        metric: violation.metric as MetricType,
        expectedValue: violation.threshold,
        actualValue: violation.actual,
        severity,
        detectedAt: new Date(),
        resolved: false,
        description: `SLA ${slaId} ${violation.metric} violation: expected ${violation.threshold}, actual ${violation.actual}`,
      };

      this.alerts.set(breach.id, breach);
      newAlerts.push(breach);

      slaService.updateStatus(slaId, 'breached');
      eventBus.publish('sla.breach.detected', { slaId, breach });
      (this.alertHandlers.get(severity) || []).forEach(h => h(breach));
      logger.warn(`[AlertManager] ${severity} breach detected: ${breach.description}`);
    }

    return newAlerts;
  }

  resolve(breachId: string): boolean {
    const breach = this.alerts.get(breachId);
    if (!breach) return false;
    breach.resolved = true;
    breach.resolvedAt = new Date();
    eventBus.publish('sla.breach.resolved', { slaId: breach.slaId, breachId });
    return true;
  }

  getActive(): SLABreach[] {
    return Array.from(this.alerts.values()).filter(a => !a.resolved);
  }

  getAll(): SLABreach[] {
    return Array.from(this.alerts.values());
  }

  getStats(): { total: number; active: number; resolved: number; bySeverity: Record<string, number> } {
    const all = Array.from(this.alerts.values());
    const bySeverity: Record<string, number> = {};
    all.forEach(a => { bySeverity[a.severity] = (bySeverity[a.severity] || 0) + 1; });
    return {
      total: all.length,
      active: all.filter(a => !a.resolved).length,
      resolved: all.filter(a => a.resolved).length,
      bySeverity,
    };
  }

  private calculateSeverity(violation: any): SLASeverity {
    const deviation = Math.abs(violation.actual - violation.threshold) / Math.max(1, violation.threshold);
    if (deviation > 0.5) return 'critical';
    if (deviation > 0.25) return 'high';
    if (deviation > 0.1) return 'medium';
    return 'low';
  }
}

export const alertManager = new AlertManager();
export default alertManager;
