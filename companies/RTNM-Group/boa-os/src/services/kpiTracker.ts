// ============================================================================
// KPI Tracker Service - KPI/OKR tracking with auto-status
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/errors';

export interface KPI {
  id: string;
  name: string;
  description: string;
  metric: string;
  unit: string;
  targetValue: number;
  currentValue: number;
  baseline: number;
  owner: string;
  measurementFrequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
  status: 'on-track' | 'at-risk' | 'off-track' | 'achieved';
  trend: 'improving' | 'declining' | 'stable' | 'unknown';
  lastMeasured: Date;
  objectiveId?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface KPIMeasurement {
  id: string;
  kpiId: string;
  value: number;
  measuredAt: Date;
  source: string;
  notes?: string;
}

export class KPITrackerService {
  private kpis: Map<string, KPI> = new Map();
  private measurements: Map<string, KPIMeasurement[]> = new Map();

  createKPI(input: Omit<KPI, 'id' | 'status' | 'trend' | 'lastMeasured' | 'createdAt' | 'updatedAt' | 'currentValue'> & { currentValue?: number }): KPI {
    const now = new Date();
    const kpi: KPI = {
      ...input,
      id: uuidv4(),
      currentValue: input.currentValue ?? input.baseline,
      status: this.calculateStatus(input.baseline, input.targetValue, input.currentValue ?? input.baseline),
      trend: 'unknown',
      lastMeasured: now,
      createdAt: now,
      updatedAt: now,
    };
    this.kpis.set(kpi.id, kpi);
    logger.info(`[KPITracker] Created KPI ${kpi.id}: ${kpi.name}`);
    return kpi;
  }

  recordMeasurement(kpiId: string, value: number, source: string = 'manual', notes?: string): KPIMeasurement {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) throw new NotFoundError(`KPI ${kpiId}`);

    const measurement: KPIMeasurement = {
      id: uuidv4(),
      kpiId,
      value,
      measuredAt: new Date(),
      source,
      notes,
    };

    if (!this.measurements.has(kpiId)) this.measurements.set(kpiId, []);
    this.measurements.get(kpiId)!.push(measurement);

    // Update KPI with new value
    const previousValue = kpi.currentValue;
    kpi.currentValue = value;
    kpi.lastMeasured = measurement.measuredAt;
    kpi.trend = this.calculateTrend(previousValue, value);
    kpi.status = this.calculateStatus(kpi.baseline, kpi.targetValue, value);
    kpi.updatedAt = new Date();

    logger.info(`[KPITracker] Recorded measurement ${value}${kpi.unit} for KPI ${kpi.name} (status: ${kpi.status})`);
    return measurement;
  }

  getKPI(id: string): KPI {
    const kpi = this.kpis.get(id);
    if (!kpi) throw new NotFoundError(`KPI ${id}`);
    return kpi;
  }

  getAllKPIs(filters?: { owner?: string; status?: KPI['status']; objectiveId?: string }): KPI[] {
    let results = Array.from(this.kpis.values());
    if (filters?.owner) results = results.filter(k => k.owner === filters.owner);
    if (filters?.status) results = results.filter(k => k.status === filters.status);
    if (filters?.objectiveId) results = results.filter(k => k.objectiveId === filters.objectiveId);
    return results;
  }

  getMeasurements(kpiId: string, limit: number = 100): KPIMeasurement[] {
    const measurements = this.measurements.get(kpiId) || [];
    return measurements.slice(-limit);
  }

  getProgress(kpiId: string): { current: number; target: number; percent: number; remaining: number } {
    const kpi = this.getKPI(kpiId);
    const percent = Math.min(100, Math.max(0, ((kpi.currentValue - kpi.baseline) / (kpi.targetValue - kpi.baseline)) * 100));
    const remaining = Math.max(0, kpi.targetValue - kpi.currentValue);
    return { current: kpi.currentValue, target: kpi.targetValue, percent, remaining };
  }

  private calculateStatus(baseline: number, target: number, current: number): KPI['status'] {
    if (target === baseline) return 'achieved';
    const progress = (current - baseline) / (target - baseline);
    if (progress >= 1) return 'achieved';
    if (progress >= 0.8) return 'on-track';
    if (progress >= 0.5) return 'at-risk';
    return 'off-track';
  }

  private calculateTrend(previous: number, current: number): KPI['trend'] {
    const change = (current - previous) / Math.max(1, Math.abs(previous));
    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }
}

export const kpiTrackerService = new KPITrackerService();
export default kpiTrackerService;
