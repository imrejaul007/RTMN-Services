/**
 * Fitness AI - Progress Service
 *
 * Business logic for progress tracking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ProgressEntry,
  IProgressEntry,
  IMeasurement,
} from '../models';

// Simple error class
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ProgressService {
  /**
   * Create a progress entry
   */
  async createEntry(data: {
    memberId: string;
    date?: Date;
    weight?: number;
    bodyFat?: number;
    measurements: IMeasurement[];
    benchPress?: number;
    squat?: number;
    deadlift?: number;
    runTime?: number;
    notes?: string;
    photos?: string[];
    goalsAchieved?: string[];
  }): Promise<IProgressEntry> {
    const entry = new ProgressEntry({
      progressId: `PRG-${uuidv4().substring(0, 8).toUpperCase()}`,
      memberId: data.memberId,
      date: data.date || new Date(),
      weight: data.weight,
      bodyFat: data.bodyFat,
      measurements: data.measurements || [],
      benchPress: data.benchPress,
      squat: data.squat,
      deadlift: data.deadlift,
      runTime: data.runTime,
      notes: data.notes,
      photos: data.photos || [],
      goalsAchieved: data.goalsAchieved || [],
    });

    await entry.save();
    return entry;
  }

  /**
   * Get progress entry by ID
   */
  async getEntryById(progressId: string): Promise<IProgressEntry | null> {
    return ProgressEntry.findOne({ progressId });
  }

  /**
   * Get member's progress history
   */
  async getMemberProgress(
    memberId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<IProgressEntry[]> {
    const query: any = { memberId };

    if (options.startDate || options.endDate) {
      query.date = {};
      if (options.startDate) query.date.$gte = options.startDate;
      if (options.endDate) query.date.$lte = options.endDate;
    }

    return ProgressEntry.find(query)
      .sort({ date: -1 })
      .limit(options.limit || 100);
  }

  /**
   * Get latest progress entry
   */
  async getLatestProgress(memberId: string): Promise<IProgressEntry | null> {
    return ProgressEntry.findOne({ memberId })
      .sort({ date: -1 });
  }

  /**
   * Update progress entry
   */
  async updateEntry(
    progressId: string,
    updates: Partial<{
      weight: number;
      bodyFat: number;
      measurements: IMeasurement[];
      benchPress: number;
      squat: number;
      deadlift: number;
      runTime: number;
      notes: string;
      photos: string[];
      goalsAchieved: string[];
    }>
  ): Promise<IProgressEntry | null> {
    return ProgressEntry.findOneAndUpdate(
      { progressId },
      { $set: updates },
      { new: true }
    );
  }

  /**
   * Delete progress entry
   */
  async deleteEntry(progressId: string): Promise<boolean> {
    const result = await ProgressEntry.findOneAndDelete({ progressId });
    return !!result;
  }

  /**
   * Get progress statistics
   */
  async getProgressStats(memberId: string): Promise<{
    totalEntries: number;
    firstEntry: IProgressEntry | null;
    latestEntry: IProgressEntry | null;
    weightChange: number | null;
    bodyFatChange: number | null;
    strengthGains: {
      benchPress: number | null;
      squat: number | null;
      deadlift: number | null;
    };
    avgMeasurements: Record<string, number>;
  }> {
    const entries = await ProgressEntry.find({ memberId })
      .sort({ date: 1 });

    if (entries.length === 0) {
      return {
        totalEntries: 0,
        firstEntry: null,
        latestEntry: null,
        weightChange: null,
        bodyFatChange: null,
        strengthGains: { benchPress: null, squat: null, deadlift: null },
        avgMeasurements: {},
      };
    }

    const first = entries[0];
    const latest = entries[entries.length - 1];

    // Calculate changes
    const weightChange = first.weight && latest.weight
      ? latest.weight - first.weight
      : null;

    const bodyFatChange = first.bodyFat && latest.bodyFat
      ? latest.bodyFat - first.bodyFat
      : null;

    // Strength gains (first vs latest with values)
    const firstWithBench = entries.find(e => e.benchPress);
    const latestWithBench = [...entries].reverse().find(e => e.benchPress);
    const benchPressGain = firstWithBench && latestWithBench
      ? latestWithBench.benchPress! - firstWithBench.benchPress!
      : null;

    const firstWithSquat = entries.find(e => e.squat);
    const latestWithSquat = [...entries].reverse().find(e => e.squat);
    const squatGain = firstWithSquat && latestWithSquat
      ? latestWithSquat.squat! - firstWithSquat.squat!
      : null;

    const firstWithDeadlift = entries.find(e => e.deadlift);
    const latestWithDeadlift = [...entries].reverse().find(e => e.deadlift);
    const deadliftGain = firstWithDeadlift && latestWithDeadlift
      ? latestWithDeadlift.deadlift! - firstWithDeadlift.deadlift!
      : null;

    // Average measurements
    const measurementSums: Record<string, { sum: number; count: number }> = {};
    entries.forEach(entry => {
      entry.measurements.forEach(m => {
        if (!measurementSums[m.type]) {
          measurementSums[m.type] = { sum: 0, count: 0 };
        }
        measurementSums[m.type].sum += m.value;
        measurementSums[m.type].count++;
      });
    });

    const avgMeasurements: Record<string, number> = {};
    Object.entries(measurementSums).forEach(([type, data]) => {
      avgMeasurements[type] = Math.round(data.sum / data.count * 10) / 10;
    });

    return {
      totalEntries: entries.length,
      firstEntry: first,
      latestEntry: latest,
      weightChange,
      bodyFatChange,
      strengthGains: {
        benchPress: benchPressGain,
        squat: squatGain,
        deadlift: deadliftGain,
      },
      avgMeasurements,
    };
  }

  /**
   * Get progress chart data
   */
  async getProgressChart(
    memberId: string,
    metrics: ('weight' | 'bodyFat' | 'benchPress' | 'squat' | 'deadlift' | 'runTime')[],
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    dates: string[];
    data: Record<string, { values: (number | null)[]; unit: string }>;
  }> {
    const query: any = { memberId };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    const entries = await ProgressEntry.find(query)
      .sort({ date: 1 })
      .select('date weight bodyFat benchPress squat deadlift runTime');

    const dates = entries.map(e => e.date.toISOString().split('T')[0]);

    const data: Record<string, { values: (number | null)[]; unit: string }> = {};

    const metricUnits: Record<string, string> = {
      weight: 'kg',
      bodyFat: '%',
      benchPress: 'kg',
      squat: 'kg',
      deadlift: 'kg',
      runTime: 'min',
    };

    metrics.forEach(metric => {
      data[metric] = {
        values: entries.map(e => (e as any)[metric] || null),
        unit: metricUnits[metric] || '',
      };
    });

    return { dates, data };
  }

  /**
   * Add photo to progress entry
   */
  async addPhoto(progressId: string, photoUrl: string): Promise<IProgressEntry | null> {
    return ProgressEntry.findOneAndUpdate(
      { progressId },
      { $push: { photos: photoUrl } },
      { new: true }
    );
  }

  /**
   * Mark goal as achieved
   */
  async markGoalAchieved(progressId: string, goal: string): Promise<IProgressEntry | null> {
    return ProgressEntry.findOneAndUpdate(
      { progressId },
      { $push: { goalsAchieved: goal } },
      { new: true }
    );
  }
}

export const progressService = new ProgressService();