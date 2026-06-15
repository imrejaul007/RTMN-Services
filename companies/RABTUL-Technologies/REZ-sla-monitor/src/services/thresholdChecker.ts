// Threshold Checker
import { SLA, SLATarget, SLAMeasurement } from '../types';
import { metricsCollector } from './metricsCollector';
import { slaService } from './slaService';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export class ThresholdChecker {
  private checkCache: Map<string, { result: any; at: Date }> = new Map();

  /**
   * Check all targets in an SLA
   */
  checkSLA(slaId: string): { compliant: boolean; violations: any[] } {
    const sla = slaService.getById(slaId);
    const violations: any[] = [];
    const now = new Date();

    for (const target of sla.targets) {
      const recent = metricsCollector.getInRange(slaId, target.metric, new Date(now.getTime() - 60 * 60 * 1000), now);
      if (recent.length === 0) continue;

      const result = this.evaluateTarget(target, recent);
      if (!result.compliant) {
        violations.push({
          metric: target.metric,
          threshold: target.threshold,
          actual: result.actual,
          comparator: target.comparator,
          measurements: recent.length,
        });
      }
    }

    const compliant = violations.length === 0;
    if (!compliant) {
      logger.warn(`[ThresholdChecker] SLA ${slaId} has ${violations.length} violations`);
      eventBus.publish('sla.violation', { slaId, violations });
    }

    this.checkCache.set(slaId, { result: { compliant, violations }, at: now });
    return { compliant, violations };
  }

  private evaluateTarget(target: SLATarget, measurements: SLAMeasurement[]): { compliant: boolean; actual: number } {
    const avg = measurements.reduce((s, m) => s + m.value, 0) / measurements.length;
    let compliant = true;
    switch (target.comparator) {
      case 'gte': compliant = avg >= target.threshold; break;
      case 'lte': compliant = avg <= target.threshold; break;
      case 'eq': compliant = avg === target.threshold; break;
      case 'between': compliant = avg >= target.threshold && avg <= (target.upperBound || Infinity); break;
    }
    return { compliant, actual: avg };
  }
}

export const thresholdChecker = new ThresholdChecker();
export default thresholdChecker;
