// Uptime Calculator
import { metricsCollector } from './metricsCollector';
import { slaService } from './slaService';
import { MetricType } from '../types';

export class UptimeCalculator {
  calculate(slaId: string, startTime: Date, endTime: Date): { uptimePercent: number; downtimeMs: number; period: { start: Date; end: Date } } {
    const sla = slaService.getById(slaId);
    const measurements = metricsCollector.getInRange(slaId, 'uptime', startTime, endTime);
    const totalPeriod = endTime.getTime() - startTime.getTime();

    if (measurements.length === 0) {
      return { uptimePercent: 100, downtimeMs: 0, period: { start: startTime, end: endTime } };
    }

    const upMeasurements = measurements.filter(m => m.value > 0);
    const uptimePercent = (upMeasurements.length / measurements.length) * 100;
    const downtimeMs = totalPeriod * (1 - uptimePercent / 100);

    return { uptimePercent: Math.round(uptimePercent * 100) / 100, downtimeMs: Math.round(downtimeMs), period: { start: startTime, end: endTime } };
  }

  calculateSLA(slaId: string): { compliant: boolean; uptimePercent: number; required: number; period: { start: Date; end: Date } } {
    const sla = slaService.getById(slaId);
    const uptimeTarget = sla.targets.find(t => t.metric === 'uptime');
    if (!uptimeTarget) return { compliant: true, uptimePercent: 100, required: 99, period: { start: sla.startDate, end: sla.endDate } };

    const result = this.calculate(slaId, sla.startDate, new Date());
    return {
      compliant: result.uptimePercent >= uptimeTarget.threshold,
      uptimePercent: result.uptimePercent,
      required: uptimeTarget.threshold,
      period: result.period,
    };
  }
}

export const uptimeCalculator = new UptimeCalculator();
export default uptimeCalculator;
