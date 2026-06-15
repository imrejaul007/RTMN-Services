// Latency Analyzer
import { metricsCollector } from './metricsCollector';
import { slaService } from './slaService';

export interface LatencyStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  period: { start: Date; end: Date };
}

export class LatencyAnalyzer {
  analyze(slaId: string, startTime: Date, endTime: Date): LatencyStats {
    const measurements = metricsCollector.getInRange(slaId, 'latency', startTime, endTime);
    if (measurements.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0, period: { start: startTime, end: endTime } };
    }

    const values = measurements.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((s, v) => s + v, 0);
    return {
      count: values.length,
      min: values[0],
      max: values[values.length - 1],
      avg: sum / values.length,
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
      period: { start: startTime, end: endTime },
    };
  }

  isWithinSLA(slaId: string, p95Latency: number): boolean {
    const sla = slaService.getById(slaId);
    const latencyTarget = sla.targets.find(t => t.metric === 'latency');
    if (!latencyTarget) return true;
    return p95Latency <= latencyTarget.threshold;
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }
}

export const latencyAnalyzer = new LatencyAnalyzer();
export default latencyAnalyzer;
