/**
 * Experiment Tracker Service
 * Tracks experiments, metrics, and model performance across runs
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Experiment, ExperimentConfig, ExperimentResult } from '../models/Experiment';

export interface MetricRecord {
  timestamp: Date;
  step: number;
  value: number;
  phase: 'train' | 'validation' | 'test';
}

export interface TrainingHistory {
  experimentId: string;
  jobId: string;
  metrics: Record<string, MetricRecord[]>;
  bestValues: Record<string, number>;
  bestStep: Record<string, number>;
}

export interface ExperimentSummary {
  experimentId: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDuration: number;
  bestScore: number;
  bestModel: string;
  scoreHistory: number[];
  startTime: Date;
  endTime: Date;
}

export class ExperimentTracker {
  private storagePath: string;
  private historyCache: Map<string, TrainingHistory> = new Map();
  private summariesCache: Map<string, ExperimentSummary> = new Map();

  constructor(storagePath: string = './experiments') {
    this.storagePath = storagePath;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'history'), { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'metrics'), { recursive: true });
    await fs.mkdir(path.join(this.storagePath, 'summaries'), { recursive: true });
  }

  async recordMetric(
    experimentId: string,
    jobId: string,
    metricName: string,
    value: number,
    step: number,
    phase: 'train' | 'validation' | 'test' = 'validation'
  ): Promise<void> {
    const history = await this.getOrCreateHistory(experimentId, jobId);

    if (!history.metrics[metricName]) {
      history.metrics[metricName] = [];
    }

    const record: MetricRecord = {
      timestamp: new Date(),
      step,
      value,
      phase
    };

    history.metrics[metricName].push(record);

    // Update best value tracking
    if (history.bestValues[metricName] === undefined || value > history.bestValues[metricName]) {
      history.bestValues[metricName] = value;
      history.bestStep[metricName] = step;
    }

    await this.saveHistory(history);
  }

  async recordMetrics(
    experimentId: string,
    jobId: string,
    metrics: Record<string, number>,
    step: number,
    phase: 'train' | 'validation' | 'test' = 'validation'
  ): Promise<void> {
    for (const [name, value] of Object.entries(metrics)) {
      await this.recordMetric(experimentId, jobId, name, value, step, phase);
    }
  }

  async getHistory(experimentId: string, jobId?: string): Promise<TrainingHistory | TrainingHistory[] | null> {
    const historyDir = path.join(this.storagePath, 'history');

    try {
      const files = await fs.readdir(historyDir);
      const matchingHistories: TrainingHistory[] = [];

      for (const file of files) {
        if (file.startsWith(`${experimentId}_`) && file.endsWith('.json')) {
          const filePath = path.join(historyDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const history = JSON.parse(content) as TrainingHistory;

          if (jobId) {
            if (history.jobId === jobId) {
              return history;
            }
          } else {
            matchingHistories.push(history);
          }
        }
      }

      if (jobId) {
        return matchingHistories.length > 0 ? matchingHistories[0] : null;
      }
      return matchingHistories;
    } catch {
      return jobId ? null : [];
    }
  }

  async getMetricHistory(
    experimentId: string,
    metricName: string,
    jobId?: string
  ): Promise<MetricRecord[]> {
    const histories = await this.getHistory(experimentId, jobId);

    if (histories === null) {
      return [];
    }

    if (!Array.isArray(histories)) {
      return histories.metrics[metricName] || [];
    }

    // Aggregate all histories for this experiment
    const aggregated: MetricRecord[] = [];
    for (const history of histories) {
      const records = history.metrics[metricName] || [];
      aggregated.push(...records);
    }

    return aggregated.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getBestMetrics(experimentId: string, jobId?: string): Promise<Record<string, number>> {
    const history = await this.getHistory(experimentId, jobId);

    if (history === null || (Array.isArray(history) && history.length === 0)) {
      return {};
    }

    if (Array.isArray(history)) {
      // Merge best values across all jobs
      const mergedBest: Record<string, number> = {};
      for (const h of history) {
        for (const [metric, value] of Object.entries(h.bestValues)) {
          const numValue = typeof value === 'number' ? value : 0;
          if (mergedBest[metric] === undefined || numValue > mergedBest[metric]) {
            mergedBest[metric] = numValue;
          }
        }
      }
      return mergedBest;
    }

    return history.bestValues;
  }

  async generateSummary(experimentId: string): Promise<ExperimentSummary> {
    const histories = await this.getHistory(experimentId) as TrainingHistory[];

    if (!histories || histories.length === 0) {
      throw new Error(`No history found for experiment ${experimentId}`);
    }

    const summaries: ExperimentSummary = {
      experimentId,
      totalRuns: histories.length,
      successfulRuns: 0,
      failedRuns: 0,
      averageDuration: 0,
      bestScore: 0,
      bestModel: '',
      scoreHistory: [],
      startTime: new Date(),
      endTime: new Date()
    };

    let totalDuration = 0;
    const allScores: number[] = [];

    for (const history of histories) {
      const accuracy = history.bestValues['accuracy'] || history.bestValues['test_score'] || 0;
      allScores.push(accuracy);

      if (accuracy > summaries.bestScore) {
        summaries.bestScore = accuracy;
        summaries.bestModel = history.jobId;
      }

      const records = history.metrics['training_time'] || [];
      if (records.length > 0) {
        totalDuration += records[records.length - 1].value;
      }
    }

    summaries.averageDuration = totalDuration / histories.length;
    summaries.scoreHistory = allScores;

    if (allScores.length > 0) {
      summaries.startTime = new Date(Math.min(...histories.map(h =>
        Math.min(...Object.values(h.metrics).flatMap(m => m.map(r => r.timestamp.getTime())))
      )));
      summaries.endTime = new Date(Math.max(...histories.map(h =>
        Math.max(...Object.values(h.metrics).flatMap(m => m.map(r => r.timestamp.getTime())))
      )));
    }

    this.summariesCache.set(experimentId, summaries);
    await this.saveSummary(summaries);

    return summaries;
  }

  async compareExperiments(experimentIds: string[]): Promise<Record<string, unknown>> {
    const summaries: ExperimentSummary[] = [];

    for (const expId of experimentIds) {
      try {
        const summary = await this.generateSummary(expId);
        summaries.push(summary);
      } catch {
        // Skip experiments without data
      }
    }

    const comparison: Record<string, unknown> = {
      experiments: summaries.map(s => ({
        id: s.experimentId,
        totalRuns: s.totalRuns,
        bestScore: s.bestScore,
        bestModel: s.bestModel,
        averageDuration: s.averageDuration
      })),
      rankedByScore: summaries
        .sort((a, b) => b.bestScore - a.bestScore)
        .map(s => s.experimentId),
      rankedByEfficiency: summaries
        .sort((a, b) => a.averageDuration - b.averageDuration)
        .map(s => s.experimentId)
    };

    return comparison;
  }

  async listExperimentIds(): Promise<string[]> {
    const historyDir = path.join(this.storagePath, 'history');

    try {
      const files = await fs.readdir(historyDir);
      const ids = new Set<string>();

      for (const file of files) {
        if (file.endsWith('.json')) {
          const id = file.split('_')[0];
          ids.add(id);
        }
      }

      return Array.from(ids);
    } catch {
      return [];
    }
  }

  async deleteExperimentHistory(experimentId: string): Promise<void> {
    const historyDir = path.join(this.storagePath, 'history');

    try {
      const files = await fs.readdir(historyDir);

      for (const file of files) {
        if (file.startsWith(`${experimentId}_`)) {
          await fs.unlink(path.join(historyDir, file));
        }
      }

      this.historyCache.delete(experimentId);
      this.summariesCache.delete(experimentId);
    } catch (error) {
      console.error(`Failed to delete history for experiment ${experimentId}:`, error);
    }
  }

  async exportMetrics(experimentId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    const histories = await this.getHistory(experimentId) as TrainingHistory[];

    if (format === 'json') {
      return JSON.stringify(histories, null, 2);
    }

    // CSV format
    const rows: string[] = ['experiment_id,job_id,metric,timestamp,step,value,phase'];

    for (const history of histories) {
      for (const [metricName, records] of Object.entries(history.metrics)) {
        for (const record of records) {
          rows.push([
            experimentId,
            history.jobId,
            metricName,
            record.timestamp.toISOString(),
            record.step.toString(),
            record.value.toString(),
            record.phase
          ].join(','));
        }
      }
    }

    return rows.join('\n');
  }

  private async getOrCreateHistory(experimentId: string, jobId: string): Promise<TrainingHistory> {
    const cacheKey = `${experimentId}_${jobId}`;
    const cached = this.historyCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const historyPath = path.join(this.storagePath, 'history', `${experimentId}_${jobId}.json`);

    try {
      const content = await fs.readFile(historyPath, 'utf-8');
      const history = JSON.parse(content) as TrainingHistory;
      this.historyCache.set(cacheKey, history);
      return history;
    } catch {
      const history: TrainingHistory = {
        experimentId,
        jobId,
        metrics: {},
        bestValues: {},
        bestStep: {}
      };
      this.historyCache.set(cacheKey, history);
      return history;
    }
  }

  private async saveHistory(history: TrainingHistory): Promise<void> {
    const historyPath = path.join(this.storagePath, 'history', `${history.experimentId}_${history.jobId}.json`);
    await fs.writeFile(historyPath, JSON.stringify(history, null, 2));
  }

  private async saveSummary(summary: ExperimentSummary): Promise<void> {
    const summaryPath = path.join(this.storagePath, 'summaries', `${summary.experimentId}.json`);
    await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2));
  }
}

// Singleton instance
export const experimentTracker = new ExperimentTracker(
  process.env.EXPERIMENT_DATA_PATH || './experiments'
);
