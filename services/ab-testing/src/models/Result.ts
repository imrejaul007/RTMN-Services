import { v4 as uuidv4 } from 'uuid';

export interface Result {
  id: string;
  experimentId: string;
  variantId: string;
  userId?: string;
  sessionId?: string;
  eventType: 'impression' | 'conversion' | 'custom';
  metricValue?: number;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  uplift?: number; // relative to control
  confidence?: number;
  isSignificant: boolean;
}

export interface CreateResultDTO {
  experimentId: string;
  variantId: string;
  userId?: string;
  sessionId?: string;
  eventType: 'impression' | 'conversion' | 'custom';
  metricValue?: number;
  metadata?: Record<string, unknown>;
}

export class ResultModel {
  private results: Map<string, Result> = new Map();

  create(dto: CreateResultDTO): Result {
    const id = `res-${uuidv4().slice(0, 8)}`;
    const result: Result = {
      id,
      ...dto,
      timestamp: new Date(),
    };

    this.results.set(id, result);
    return result;
  }

  findById(id: string): Result | undefined {
    return this.results.get(id);
  }

  findByExperiment(experimentId: string): Result[] {
    return Array.from(this.results.values())
      .filter(r => r.experimentId === experimentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  findByVariant(variantId: string): Result[] {
    return Array.from(this.results.values())
      .filter(r => r.variantId === variantId);
  }

  aggregateByVariant(experimentId: string): Map<string, {
    impressions: number;
    conversions: number;
    events: Result[];
  }> {
    const results = this.findByExperiment(experimentId);
    const aggregated = new Map<string, {
      impressions: number;
      conversions: number;
      events: Result[];
    }>();

    for (const result of results) {
      const existing = aggregated.get(result.variantId) || {
        impressions: 0,
        conversions: 0,
        events: [],
      };

      if (result.eventType === 'impression') {
        existing.impressions++;
      } else if (result.eventType === 'conversion') {
        existing.conversions++;
      }

      existing.events.push(result);
      aggregated.set(result.variantId, existing);
    }

    return aggregated;
  }

  getUniqueUsers(experimentId: string): Set<string> {
    const results = this.findByExperiment(experimentId);
    const users = new Set<string>();

    for (const result of results) {
      if (result.userId) {
        users.add(result.userId);
      }
    }

    return users;
  }

  getTimeSeries(experimentId: string, granularity: 'hour' | 'day' = 'day'): Map<string, Map<string, {
    impressions: number;
    conversions: number;
  }>> {
    const results = this.findByExperiment(experimentId);
    const timeSeries = new Map<string, Map<string, {
      impressions: number;
      conversions: number;
    }>>();

    for (const result of results) {
      const date = new Date(result.timestamp);
      const key = granularity === 'hour'
        ? `${date.toISOString().slice(0, 13)}:00`
        : date.toISOString().slice(0, 10);

      if (!timeSeries.has(result.variantId)) {
        timeSeries.set(result.variantId, new Map());
      }

      const variantData = timeSeries.get(result.variantId)!;
      if (!variantData.has(key)) {
        variantData.set(key, { impressions: 0, conversions: 0 });
      }

      const data = variantData.get(key)!;
      if (result.eventType === 'impression') {
        data.impressions++;
      } else if (result.eventType === 'conversion') {
        data.conversions++;
      }
    }

    return timeSeries;
  }

  deleteByExperiment(experimentId: string): number {
    const toDelete = this.findByExperiment(experimentId);
    toDelete.forEach(r => this.results.delete(r.id));
    return toDelete.length;
  }

  count(experimentId: string): number {
    return this.findByExperiment(experimentId).length;
  }
}

export const resultModel = new ResultModel();
