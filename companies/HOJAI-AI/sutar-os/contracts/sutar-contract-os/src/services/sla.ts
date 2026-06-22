/**
 * SLA Service
 * Phase B.5 — Real implementation (was 2-LOC stub)
 */

import type { SLA, SLAMetric, SLAMetricType, SLAPenalty } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

const SLA_STORE = new Map<string, SLA>();
const METRIC_READINGS = new Map<string, SLAMetricReading[]>(); // metricId -> readings

export interface SLAMetricReading {
  metricId: string;
  value: number;
  recordedAt: string;
  compliant: boolean;
  notes?: string;
}

export interface SLAMetricStatus {
  metric: SLAMetric;
  current: number;
  compliant: boolean;
  breachCount: number;
  complianceRate: number; // 0-1
}

export interface SLABreachReport {
  slaId: string;
  contractId: string;
  generatedAt: string;
  metrics: SLAMetricStatus[];
  overallCompliant: boolean;
  totalPenalties: number;
  currency: string;
}

export function createSLA(input: Omit<SLA, 'id' | 'createdAt' | 'updatedAt'>): SLA {
  const now = new Date().toISOString();
  const sla: SLA = {
    id: `sla-${uuidv4()}`,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  SLA_STORE.set(sla.id, sla);
  return sla;
}

export function getSLA(id: string): SLA | null {
  return SLA_STORE.get(id) || null;
}

export function getSLAsForContract(contractId: string): SLA[] {
  return Array.from(SLA_STORE.values()).filter(s => s.contractId === contractId);
}

export function updateSLA(id: string, updates: Partial<SLA>): SLA | null {
  const existing = SLA_STORE.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  SLA_STORE.set(id, updated);
  return updated;
}

export function deleteSLA(id: string): boolean {
  return SLA_STORE.delete(id);
}

function checkCompliance(metric: SLAMetric, value: number): boolean {
  // For most metrics, higher is better (uptime, quality, support score)
  // For response_time and delivery, lower is better
  const lowerIsBetter = metric.type === 'response_time' || metric.type === 'delivery';
  if (lowerIsBetter) return value <= metric.threshold;
  return value >= metric.threshold;
}

export function recordMetricReading(reading: Omit<SLAMetricReading, 'compliant'>): SLAMetricReading {
  // Find which SLA owns this metric
  let metric: SLAMetric | undefined;
  for (const sla of SLA_STORE.values()) {
    const found = sla.metrics.find(m => m.id === reading.metricId);
    if (found) {
      metric = found;
      break;
    }
  }
  const compliant = metric ? checkCompliance(metric, reading.value) : true;
  const full: SLAMetricReading = { ...reading, compliant };
  const list = METRIC_READINGS.get(reading.metricId) || [];
  list.push(full);
  METRIC_READINGS.set(reading.metricId, list);
  return full;
}

export function generateBreachReport(slaId: string): SLABreachReport | null {
  const sla = SLA_STORE.get(slaId);
  if (!sla) return null;

  const metricStatuses: SLAMetricStatus[] = sla.metrics.map(m => {
    const readings = METRIC_READINGS.get(m.id) || [];
    const breachCount = readings.filter(r => !r.compliant).length;
    const complianceRate = readings.length ? 1 - breachCount / readings.length : 1;
    const current = readings.length ? readings[readings.length - 1].value : m.target;
    return {
      metric: m,
      current,
      compliant: breachCount === 0,
      breachCount,
      complianceRate,
    };
  });

  const overallCompliant = metricStatuses.every(m => m.compliant);
  const totalPenalties = (sla.penalties || []).reduce((sum, p) => {
    const status = metricStatuses.find(s => s.metric.id === p.metricId);
    if (!status) return sum;
    if (p.condition === 'below_threshold' && !status.compliant) return sum + p.amount;
    if (p.condition === 'breach_count' && status.breachCount >= p.threshold) return sum + p.amount;
    return sum;
  }, 0);

  const currency = sla.penalties?.[0]?.currency ?? 'USD';

  return {
    slaId,
    contractId: sla.contractId,
    generatedAt: new Date().toISOString(),
    metrics: metricStatuses,
    overallCompliant,
    totalPenalties,
    currency,
  };
}

export function getMetricHistory(metricId: string): SLAMetricReading[] {
  return METRIC_READINGS.get(metricId) || [];
}

export function calculatePenalty(metric: SLAMetric, value: number, penalty: SLAPenalty): number {
  if (penalty.condition === 'below_threshold' && value < penalty.threshold) {
    return penalty.type === 'percentage' ? 0 : penalty.amount;
  }
  return 0;
}

export const _internal = { SLA_STORE, METRIC_READINGS };
export default {
  createSLA,
  getSLA,
  getSLAsForContract,
  updateSLA,
  deleteSLA,
  recordMetricReading,
  generateBreachReport,
  getMetricHistory,
  calculatePenalty,
};
