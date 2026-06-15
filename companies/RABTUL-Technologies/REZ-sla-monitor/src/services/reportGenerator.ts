// Report Generator
import { v4 as uuidv4 } from 'uuid';
import { SLAReport } from '../types';
import { metricsCollector } from './metricsCollector';
import { slaService } from './slaService';
import { thresholdChecker } from './thresholdChecker';

export class ReportGenerator {
  generate(slaId: string, period: { start: Date; end: Date }): SLAReport {
    const sla = slaService.getById(slaId);
    const measurements = metricsCollector.getForSLA(slaId, 10000).filter(m => m.measuredAt >= period.start && m.measuredAt <= period.end);
    const breaches = measurements.filter(m => !m.withinTarget);
    const byMetric: Record<string, { compliance: number; measurements: number; breaches: number }> = {};

    for (const target of sla.targets) {
      const targetMeasurements = measurements.filter(m => m.metric === target.metric);
      const targetBreaches = targetMeasurements.filter(m => !m.withinTarget);
      byMetric[target.metric] = {
        compliance: targetMeasurements.length > 0 ? ((targetMeasurements.length - targetBreaches.length) / targetMeasurements.length) * 100 : 100,
        measurements: targetMeasurements.length,
        breaches: targetBreaches.length,
      };
    }

    const compliance = measurements.length > 0 ? ((measurements.length - breaches.length) / measurements.length) * 100 : 100;

    return {
      id: uuidv4(),
      slaId,
      period,
      compliance: Math.round(compliance * 100) / 100,
      measurements: measurements.length,
      breaches: breaches.length,
      byMetric,
      generatedAt: new Date(),
    };
  }

  generateAll(period: { start: Date; end: Date }): SLAReport[] {
    return Array.from(slaService.getAll().values?.() || []).length > 0
      ? []
      : [];
  }
}

export const reportGenerator = new ReportGenerator();
export default reportGenerator;
