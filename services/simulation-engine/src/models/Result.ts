import mongoose, { Schema, Document } from 'mongoose';
import {
  SimulationResults,
  StatisticalMetrics,
  MetricProjection,
  ImpactSummary,
  ScenarioComparison,
  RiskAnalysis,
  TimeSeriesPoint,
  ScenarioCategory,
} from '../types';

export interface ResultDocument extends Document {
  _id: mongoose.Types.ObjectId;
  simulationId: string;
  tenantId: string;
  scenarioId: string;
  category: ScenarioCategory;
  results: SimulationResults;
  cachedAt: Date;
  expiresAt: Date;
}

const StatisticalMetricsSchema = new Schema<StatisticalMetrics>(
  {
    mean: { type: Number, required: true },
    median: { type: Number, required: true },
    stdDev: { type: Number, required: true },
    min: { type: Number, required: true },
    max: { type: Number, required: true },
    percentile25: { type: Number, required: true },
    percentile75: { type: Number, required: true },
    percentile95: { type: Number, required: true },
    percentile99: { type: Number, required: true },
    variance: { type: Number, required: true },
    skewness: { type: Number },
    kurtosis: { type: Number },
  },
  { _id: false }
);

const TimeSeriesPointSchema = new Schema<TimeSeriesPoint>(
  {
    timestamp: { type: Date, required: true },
    value: { type: Number, required: true },
    lowerBound: { type: Number },
    upperBound: { type: Number },
  },
  { _id: false }
);

const MetricProjectionSchema = new Schema<MetricProjection>(
  {
    metric: { type: String, required: true },
    baseline: { type: Number, required: true },
    projections: { type: [TimeSeriesPointSchema], required: true },
    statistics: { type: StatisticalMetricsSchema, required: true },
    distribution: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const MetricImpactSchema = new Schema(
  {
    metric: { type: String, required: true },
    baseline: { type: Number, required: true },
    projected: { type: Number, required: true },
    change: { type: Number, required: true },
    changePercent: { type: Number, required: true },
    confidence: { type: Number, required: true },
  },
  { _id: false }
);

const ImpactSummarySchema = new Schema<ImpactSummary>(
  {
    csat: { type: MetricImpactSchema, required: true },
    revenue: { type: MetricImpactSchema, required: true },
    churn: { type: MetricImpactSchema, required: true },
    supportCost: { type: MetricImpactSchema, required: true },
    netImpact: { type: MetricImpactSchema, required: true },
  },
  { _id: false }
);

const ScenarioComparisonSchema = new Schema<ScenarioComparison>(
  {
    scenarioId: { type: String, required: true },
    scenarioName: { type: String, required: true },
    impactSummary: { type: ImpactSummarySchema, required: true },
    riskScore: { type: Number, required: true },
    recommendation: { type: String, required: true },
  },
  { _id: false }
);

const RiskFactorSchema = new Schema(
  {
    factor: { type: String, required: true },
    probability: { type: Number, required: true },
    impact: { type: Number, required: true },
    mitigation: { type: String },
  },
  { _id: false }
);

const RiskAnalysisSchema = new Schema<RiskAnalysis>(
  {
    overallRiskScore: { type: Number, required: true },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    riskFactors: { type: [RiskFactorSchema], required: true },
    valueAtRisk: { type: Number, required: true },
    confidenceInterval: { type: [Number], required: true },
  },
  { _id: false }
);

const RecommendationSchema = new Schema(
  {
    priority: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    expectedImpact: { type: Number, required: true },
    confidence: { type: Number, required: true },
    caveats: { type: [String], default: [] },
  },
  { _id: false }
);

const ResultsSummarySchema = new Schema(
  {
    totalIterations: { type: Number, required: true },
    successfulIterations: { type: Number, required: true },
    failedIterations: { type: Number, required: true },
    executionTime: { type: Number, required: true },
    confidenceLevel: { type: Number, required: true },
  },
  { _id: false }
);

const SimulationResultsSchema = new Schema<SimulationResults>(
  {
    summary: { type: ResultsSummarySchema, required: true },
    metrics: {
      csat: { type: MetricProjectionSchema, required: true },
      revenue: { type: MetricProjectionSchema, required: true },
      churn: { type: MetricProjectionSchema, required: true },
      supportCost: { type: MetricProjectionSchema, required: true },
      netRevenue: { type: MetricProjectionSchema, required: true },
    },
    impactSummary: { type: ImpactSummarySchema, required: true },
    scenarios: { type: [ScenarioComparisonSchema], default: [] },
    riskAnalysis: { type: RiskAnalysisSchema, required: true },
    timeSeries: { type: [TimeSeriesPointSchema], default: [] },
    recommendations: { type: [RecommendationSchema], default: [] },
  },
  { _id: false }
);

const ResultSchema = new Schema<ResultDocument>(
  {
    simulationId: { type: String, required: true, index: true, unique: true },
    tenantId: { type: String, required: true, index: true },
    scenarioId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: Object.values(ScenarioCategory),
      required: true,
      index: true,
    },
    results: { type: SimulationResultsSchema, required: true },
    cachedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, index: true },
  },
  {
    timestamps: true,
    collection: 'simulation_results',
  }
);

// Virtual for id
ResultSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// TTL index for automatic cache expiration
ResultSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes
ResultSchema.index({ tenantId: 1, scenarioId: 1 });
ResultSchema.index({ tenantId: 1, category: 1 });
ResultSchema.index({ cachedAt: 1 });

// Static methods
ResultSchema.statics.findBySimulation = function (simulationId: string) {
  return this.findOne({ simulationId });
};

ResultSchema.statics.findByTenant = function (
  tenantId: string,
  options: {
    category?: ScenarioCategory;
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: Record<string, unknown> = { tenantId };

  if (options.category) {
    query.category = options.category;
  }

  return this.find(query)
    .sort({ cachedAt: -1 })
    .skip(options.offset || 0)
    .limit(options.limit || 50);
};

ResultSchema.statics.cleanupExpired = function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

export const ResultModel = mongoose.model<ResultDocument>('Result', ResultSchema);
