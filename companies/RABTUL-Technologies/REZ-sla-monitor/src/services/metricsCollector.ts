// Metrics Collector
import { v4 as uuidv4 } from 'uuid';
import { SLAMeasurement, MetricType } from '../types';
import { logger } from '../utils/logger';
import { slaService } from './slaService';

export class MetricsCollector {
  private measurements: Map<string, SLAMeasurement[]> = new Map();

  record(slaId: string, metric: MetricType, value: number, unit: string, source: string = 'manual', notes?: string): SLAMeasurement {
    const sla = slaService.getById(slaId);
    const target = sla.targets.find(t => t.metric === metric);
    const withinTarget = target ? this.checkWithinTarget(value, target) : true;

    const measurement: SLAMeasurement = {
      id: uuidv4(),
      slaId,
      metric,
      value,
      unit,
      measuredAt: new Date(),
      source,
      withinTarget,
      notes,
    };

    if (!this.measurements.has(slaId)) this.measurements.set(slaId, []);
    this.measurements.get(slaId)!.push(measurement);

    if (!withinTarget) {
      logger.warn(`[MetricsCollector] SLA ${slaId} metric ${metric} out of target: ${value}${unit} (expected ${target?.threshold}${target?.unit})`);
    }

    return measurement;
  }

  getForSLA(slaId: string, limit: number = 100): SLAMeasurement[] {
    return (this.measurements.get(slaId) || []).slice(-limit);
  }

  getInRange(slaId: string, metric: MetricType, startTime: Date, endTime: Date): SLAMeasurement[] {
    return (this.measurements.get(slaId) || []).filter(m =>
      m.metric === metric && m.measuredAt >= startTime && m.measuredAt <= endTime
    );
  }

  private checkWithinTarget(value: number, target: any): boolean {
    switch (target.comparator) {
      case 'gte': return value >= target.threshold;
      case 'lte': return value <= target.threshold;
      case 'eq': return value === target.threshold;
      case 'between': return value >= target.threshold && value <= (target.upperBound || Infinity);
      default: return true;
    }
  }
}

export const metricsCollector = new MetricsCollector();
export default metricsCollector;
