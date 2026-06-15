// Detection Engine
import { BreachService } from './breachService';
import { Breach, BreachType } from '../types';
import { logger } from '../utils/logger';
import { eventBus } from '../utils/eventBus';

export interface MonitoringData {
  slaId: string;
  serviceId: string;
  metric: string;
  value: number;
  threshold: number;
  comparator: 'gte' | 'lte' | 'eq' | 'between';
  unit: string;
  timestamp: Date;
  history?: number[];
}

export class DetectionEngine {
  private history: Map<string, number[]> = new Map();
  private breachService: BreachService;

  constructor(breachService: BreachService) {
    this.breachService = breachService;
  }

  /**
   * Analyze monitoring data and detect breaches
   */
  analyze(data: MonitoringData): Breach[] {
    const breaches: Breach[] = [];
    const breaches1 = this.detectThreshold(data);
    breaches.push(...breaches1);

    if (data.history && data.history.length >= 5) {
      const anomalies = this.detectAnomaly(data);
      breaches.push(...anomalies);
      const patterns = this.detectPattern(data);
      breaches.push(...patterns);
      const sustained = this.detectSustained(data);
      breaches.push(...sustained);
    }

    // Update history
    const key = `${data.slaId}:${data.metric}`;
    if (!this.history.has(key)) this.history.set(key, []);
    this.history.get(key)!.push(data.value);
    if (this.history.get(key)!.length > 100) this.history.get(key)!.shift();

    return breaches;
  }

  private detectThreshold(data: MonitoringData): Breach[] {
    let isViolation = false;
    switch (data.comparator) {
      case 'gte': isViolation = data.value < data.threshold; break;
      case 'lte': isViolation = data.value > data.threshold; break;
      case 'eq': isViolation = data.value !== data.threshold; break;
      case 'between': isViolation = data.value < data.threshold; break;
    }
    if (!isViolation) return [];

    return [this.breachService.detect({
      slaId: data.slaId,
      serviceId: data.serviceId,
      type: 'threshold',
      metric: data.metric,
      expectedValue: data.threshold,
      actualValue: data.value,
      description: `Threshold breach: ${data.metric} = ${data.value}${data.unit} (expected ${data.threshold}${data.unit})`,
    })];
  }

  private detectAnomaly(data: MonitoringData): Breach[] {
    const key = `${data.slaId}:${data.metric}`;
    const history = this.history.get(key) || [];
    if (history.length < 5) return [];

    const mean = history.reduce((s, v) => s + v, 0) / history.length;
    const variance = history.reduce((s, v) => s + (v - mean) ** 2, 0) / history.length;
    const stdDev = Math.sqrt(variance);
    const zScore = stdDev > 0 ? Math.abs((data.value - mean) / stdDev) : 0;

    if (zScore > 3) {
      return [this.breachService.detect({
        slaId: data.slaId, serviceId: data.serviceId, type: 'anomaly', metric: data.metric,
        expectedValue: mean, actualValue: data.value,
        description: `Anomaly detected: z-score ${zScore.toFixed(2)} for ${data.metric}`,
        metadata: { zScore, mean, stdDev },
      })];
    }
    return [];
  }

  private detectPattern(data: MonitoringData): Breach[] {
    const key = `${data.slaId}:${data.metric}`;
    const history = this.history.get(key) || [];
    if (history.length < 5) return [];

    // Detect sudden spike (3x increase)
    const recent = history.slice(-3);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    if (avg > 0 && data.value > avg * 3) {
      return [this.breachService.detect({
        slaId: data.slaId, serviceId: data.serviceId, type: 'spike', metric: data.metric,
        expectedValue: avg, actualValue: data.value,
        description: `Spike detected: ${data.value} (3x recent average ${avg.toFixed(2)})`,
      })];
    }
    return [];
  }

  private detectSustained(data: MonitoringData): Breach[] {
    const key = `${data.slaId}:${data.metric}`;
    const history = this.history.get(key) || [];
    if (history.length < 5) return [];

    // Detect sustained degradation (5 consecutive declining values)
    const last5 = history.slice(-5);
    const isMonotonic = last5.every((v, i) => i === 0 || v < last5[i - 1]);
    if (isMonotonic && data.comparator === 'gte') {
      return [this.breachService.detect({
        slaId: data.slaId, serviceId: data.serviceId, type: 'sustained', metric: data.metric,
        expectedValue: last5[0], actualValue: data.value,
        description: `Sustained degradation: 5 consecutive declining values`,
      })];
    }
    return [];
  }
}

export const detectionEngine = new DetectionEngine(breachService);
export default detectionEngine;
