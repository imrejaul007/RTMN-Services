// ============================================================================
// SUTAR Network Learning - A/B Testing Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  Experiment,
  ExperimentVariant,
  ExperimentMetric,
  ExperimentStatus
} from './types';

interface ExperimentResult {
  experimentId: string;
  variantId: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidence: number;
  pValue: number;
  isWinner: boolean;
}

interface StatisticalTest {
  testType: 't-test' | 'chi-square' | 'mann-whitney';
  statistic: number;
  pValue: number;
  confidenceLevel: number;
  significant: boolean;
}

class ABTestingService {
  private experiments: Map<string, Experiment> = new Map();
  private results: Map<string, ExperimentResult[]> = new Map();
  private activeAssignments: Map<string, Map<string, string>> = new Map();

  // Create new experiment
  createExperiment(params: {
    name: string;
    description: string;
    hypothesis: string;
    variants: Omit<ExperimentVariant, 'id' | 'conversions' | 'impressions' | 'conversionRate'>[];
    metrics: Omit<ExperimentMetric, 'value' | 'confidence' | 'variantComparisons'>[];
    targetSampleSize?: number;
    significanceLevel?: number;
  }): Experiment {
    const experimentId = `exp-${uuidv4()}`;

    const variants: ExperimentVariant[] = params.variants.map((v, i) => ({
      id: `variant-${uuidv4()}`,
      name: v.name,
      description: v.description,
      config: v.config,
      trafficAllocation: v.trafficAllocation,
      conversions: 0,
      impressions: 0,
      conversionRate: 0
    }));

    const totalAllocation = variants.reduce((sum, v) => sum + v.trafficAllocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      const equalAllocation = 100 / variants.length;
      variants.forEach(v => v.trafficAllocation = equalAllocation);
    }

    const experiment: Experiment = {
      id: experimentId,
      name: params.name,
      description: params.description,
      hypothesis: params.hypothesis,
      variants,
      metrics: params.metrics.map(m => ({
        ...m,
        value: 0,
        confidence: 0,
        variantComparisons: {}
      })),
      status: 'running',
      startedAt: new Date().toISOString(),
      sampleSize: 0,
      targetSampleSize: params.targetSampleSize || 1000,
      statisticalPower: 0.8,
      significanceLevel: params.significanceLevel || 0.05
    };

    this.experiments.set(experimentId, experiment);
    this.results.set(experimentId, []);
    this.activeAssignments.set(experimentId, new Map());

    console.log(`[EXP] Created experiment: ${experiment.name} (${experimentId})`);
    return experiment;
  }

  // Assign user to variant
  assignUser(experimentId: string, userId: string): ExperimentVariant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    const assignments = this.activeAssignments.get(experimentId)!;

    if (assignments.has(userId)) {
      const variantId = assignments.get(userId)!;
      return experiment.variants.find(v => v.id === variantId) || null;
    }

    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedVariant: ExperimentVariant | null = null;

    for (const variant of experiment.variants) {
      cumulative += variant.trafficAllocation;
      if (random < cumulative) {
        selectedVariant = variant;
        break;
      }
    }

    if (selectedVariant) {
      assignments.set(userId, selectedVariant.id);
      selectedVariant.impressions++;
      experiment.sampleSize++;
    }

    return selectedVariant;
  }

  // Record conversion
  recordConversion(experimentId: string, userId: string, value?: number): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') {
      return false;
    }

    const assignments = this.activeAssignments.get(experimentId)!;
    const variantId = assignments.get(userId);

    if (!variantId) {
      return false;
    }

    const variant = experiment.variants.find(v => v.id === variantId);
    if (!variant) {
      return false;
    }

    variant.conversions++;
    variant.conversionRate = variant.conversions / variant.impressions;

    if (value !== undefined) {
      const metric = experiment.metrics[0];
      if (metric) {
        metric.value += value;
      }
    }

    this.checkExperimentCompletion(experimentId);

    return true;
  }

  // Check if experiment should complete
  private checkExperimentCompletion(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    if (experiment.sampleSize >= experiment.targetSampleSize) {
      this.completeExperiment(experimentId);
    }
  }

  // Complete experiment
  completeExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    experiment.status = 'completed';
    experiment.endedAt = new Date().toISOString();

    const analysis = this.analyzeResults(experimentId);
    experiment.winner = analysis.winner?.variantId;
    experiment.pValue = analysis.winner?.pValue;

    console.log(`[EXP] Completed experiment: ${experiment.name}, winner: ${experiment.winner || 'none'}`);
  }

  // Analyze experiment results
  private analyzeResults(experimentId: string): {
    winner: ExperimentResult | null;
    allResults: ExperimentResult[];
    statisticalTests: StatisticalTest[];
  } {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return { winner: null, allResults: [], statisticalTests: [] };
    }

    const results: ExperimentResult[] = experiment.variants.map(variant => {
      const conversionRate = variant.impressions > 0
        ? variant.conversions / variant.impressions
        : 0;

      return {
        experimentId,
        variantId: variant.id,
        impressions: variant.impressions,
        conversions: variant.conversions,
        conversionRate,
        confidence: this.calculateConfidence(variant, experiment),
        pValue: 0,
        isWinner: false
      };
    });

    const controlVariant = results[0];
    const treatmentVariants = results.slice(1);

    treatmentVariants.forEach(treatment => {
      const test = this.performStatisticalTest(controlVariant, treatment, experiment.significanceLevel);
      treatment.pValue = test.pValue;
    });

    const winner = results
      .filter(r => r.impressions > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)[0];

    if (winner) {
      const winnerTest = results.find(r => r.variantId === winner.variantId);
      if (winnerTest && winnerTest.pValue < experiment.significanceLevel) {
        winner.isWinner = true;
      }
    }

    const statisticalTests: StatisticalTest[] = treatmentVariants.map(treatment => ({
      testType: 'chi-square',
      statistic: this.calculateChiSquare(controlVariant, treatment),
      pValue: treatment.pValue,
      confidenceLevel: 1 - experiment.significanceLevel,
      significant: treatment.pValue < experiment.significanceLevel
    }));

    this.results.set(experimentId, results);

    return { winner, allResults: results, statisticalTests };
  }

  // Calculate confidence level
  private calculateConfidence(variant: ExperimentVariant, experiment: Experiment): number {
    if (variant.impressions < 30) {
      return Math.min(0.9, variant.impressions / 30);
    }

    const zScore = 1.96;
    const p = variant.conversionRate;
    const n = variant.impressions;
    const se = Math.sqrt((p * (1 - p)) / n);

    return Math.min(0.99, 1 - zScore * se);
  }

  // Perform statistical test
  private performStatisticalTest(
    control: ExperimentResult,
    treatment: ExperimentResult,
    alpha: number
  ): StatisticalTest {
    const n1 = control.impressions;
    const n2 = treatment.impressions;
    const p1 = control.conversionRate;
    const p2 = treatment.conversionRate;

    const pooledP = (control.conversions + treatment.conversions) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

    const z = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    return {
      testType: 't-test',
      statistic: z,
      pValue,
      confidenceLevel: 1 - alpha,
      significant: pValue < alpha
    };
  }

  // Normal CDF approximation
  private normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  // Calculate chi-square statistic
  private calculateChiSquare(control: ExperimentResult, treatment: ExperimentResult): number {
    const total = control.impressions + treatment.impressions;
    const conversions = control.conversions + treatment.conversions;
    const nonConversions = total - conversions;

    const expectedControlConversions = (control.impressions * conversions) / total;
    const expectedTreatmentConversions = (treatment.impressions * conversions) / total;
    const expectedControlNonConversions = (control.impressions * nonConversions) / total;
    const expectedTreatmentNonConversions = (treatment.impressions * nonConversions) / total;

    const chiSquare =
      Math.pow(control.conversions - expectedControlConversions, 2) / expectedControlConversions +
      Math.pow(treatment.conversions - expectedTreatmentConversions, 2) / expectedTreatmentConversions +
      Math.pow((control.impressions - control.conversions) - expectedControlNonConversions, 2) / expectedControlNonConversions +
      Math.pow((treatment.impressions - treatment.conversions) - expectedTreatmentNonConversions, 2) / expectedTreatmentNonConversions;

    return chiSquare;
  }

  // Get experiment by ID
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  // Get all experiments
  getExperiments(filters?: {
    status?: ExperimentStatus;
    from?: string;
    to?: string;
  }): Experiment[] {
    let result = Array.from(this.experiments.values());

    if (filters?.status) {
      result = result.filter(e => e.status === filters.status);
    }
    if (filters?.from) {
      result = result.filter(e => e.startedAt >= filters.from!);
    }
    if (filters?.to) {
      result = result.filter(e => e.startedAt <= filters.to!);
    }

    return result.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  // Get experiment results
  getExperimentResults(experimentId: string): {
    experiment: Experiment;
    results: ExperimentResult[];
    statisticalTests: StatisticalTest[];
    summary: {
      totalImpressions: number;
      totalConversions: number;
      overallConversionRate: number;
      winner: string | null;
      lift: number;
      confidence: number;
    };
  } | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return null;

    const analysis = this.analyzeResults(experimentId);

    const totalImpressions = experiment.variants.reduce((sum, v) => sum + v.impressions, 0);
    const totalConversions = experiment.variants.reduce((sum, v) => sum + v.conversions, 0);
    const overallConversionRate = totalImpressions > 0 ? totalConversions / totalImpressions : 0;

    const controlRate = experiment.variants[0]?.conversionRate || 0;
    const winnerRate = analysis.winner?.conversionRate || 0;
    const lift = controlRate > 0 ? ((winnerRate - controlRate) / controlRate) * 100 : 0;

    return {
      experiment,
      results: analysis.allResults,
      statisticalTests: analysis.statisticalTests,
      summary: {
        totalImpressions,
        totalConversions,
        overallConversionRate,
        winner: experiment.winner || null,
        lift,
        confidence: analysis.winner?.confidence || 0
      }
    };
  }

  // Pause experiment
  pauseExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment && experiment.status === 'running') {
      experiment.status = 'paused';
    }
  }

  // Resume experiment
  resumeExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment && experiment.status === 'paused') {
      experiment.status = 'running';
    }
  }

  // Cancel experiment
  cancelExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.status = 'cancelled';
      experiment.endedAt = new Date().toISOString();
    }
  }

  // Update experiment target
  updateTargetSampleSize(experimentId: string, newTarget: number): void {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.targetSampleSize = newTarget;
    }
  }

  // Get active experiments
  getActiveExperiments(): Experiment[] {
    return Array.from(this.experiments.values())
      .filter(e => e.status === 'running');
  }

  // Get statistics
  getStatistics(): {
    totalExperiments: number;
    runningExperiments: number;
    completedExperiments: number;
    pausedExperiments: number;
    cancelledExperiments: number;
    avgLift: number;
    avgConversionRate: number;
  } {
    const all = Array.from(this.experiments.values());
    const completed = all.filter(e => e.status === 'completed');

    let totalLift = 0;
    let liftCount = 0;
    let totalConversionRate = 0;

    completed.forEach(e => {
      if (e.winner) {
        const winnerVariant = e.variants.find(v => v.id === e.winner);
        const controlVariant = e.variants[0];
        if (winnerVariant && controlVariant) {
          const controlRate = controlVariant.conversionRate;
          const winnerRate = winnerVariant.conversionRate;
          if (controlRate > 0) {
            totalLift += ((winnerRate - controlRate) / controlRate) * 100;
            liftCount++;
          }
        }
      }

      const totalImpressions = e.variants.reduce((sum, v) => sum + v.impressions, 0);
      const totalConversions = e.variants.reduce((sum, v) => sum + v.conversions, 0);
      if (totalImpressions > 0) {
        totalConversionRate += totalConversions / totalImpressions;
      }
    });

    return {
      totalExperiments: all.length,
      runningExperiments: all.filter(e => e.status === 'running').length,
      completedExperiments: completed.length,
      pausedExperiments: all.filter(e => e.status === 'paused').length,
      cancelledExperiments: all.filter(e => e.status === 'cancelled').length,
      avgLift: liftCount > 0 ? totalLift / liftCount : 0,
      avgConversionRate: completed.length > 0 ? totalConversionRate / completed.length : 0
    };
  }

  // Export experiment data
  exportExperiment(experimentId: string): Experiment | null {
    return this.experiments.get(experimentId) || null;
  }

  // Clear all data
  clearData(): void {
    this.experiments.clear();
    this.results.clear();
    this.activeAssignments.clear();
  }
}

export const abTestingService = new ABTestingService();
export default abTestingService;
