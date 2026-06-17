import mongoose, { Schema, Document } from 'mongoose';
import {
  Simulation as ISimulation,
  SimulationStatus,
  SimulationPriority,
  SimulationConfig,
  SimulationResults,
  ScenarioCategory,
  ScenarioType,
} from '../types';

export interface SimulationDocument extends Omit<ISimulation, 'id'>, Document {
  _id: mongoose.Types.ObjectId;
}

const MonteCarloConfigSchema = new Schema({
  iterations: { type: Number, default: 1000 },
  confidenceLevel: { type: Number, default: 0.95 },
  distribution: {
    type: String,
    enum: ['normal', 'uniform', 'exponential', 'poisson'],
    default: 'normal',
  },
  seed: { type: Number },
});

const TimeHorizonSchema = new Schema({
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  granularity: {
    type: String,
    enum: ['hour', 'day', 'week', 'month'],
    default: 'day',
  },
});

const SimulationConfigSchema = new Schema({
  scenarioId: { type: String, required: true },
  monteCarlo: { type: MonteCarloConfigSchema, default: () => ({}) },
  timeHorizon: { type: TimeHorizonSchema, required: true },
  sensitivityAnalysis: { type: Boolean, default: false },
  parallelRuns: { type: Number, default: 1, min: 1, max: 10 },
});

const SimulationResultsSchema = new Schema({
  summary: {
    totalIterations: Number,
    successfulIterations: Number,
    failedIterations: Number,
    executionTime: Number,
    confidenceLevel: Number,
  },
  metrics: Schema.Types.Mixed,
  impactSummary: Schema.Types.Mixed,
  scenarios: Schema.Types.Mixed,
  riskAnalysis: Schema.Types.Mixed,
  timeSeries: Schema.Types.Mixed,
  recommendations: Schema.Types.Mixed,
});

const SimulationSchema = new Schema<SimulationDocument>(
  {
    name: { type: String, required: true, maxlength: 200 },
    description: { type: String, maxlength: 1000 },
    scenarioId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(SimulationStatus),
      default: SimulationStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(SimulationPriority),
      default: SimulationPriority.MEDIUM,
    },
    config: { type: SimulationConfigSchema, required: true },
    results: { type: SimulationResultsSchema },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'simulations',
  }
);

// Indexes for efficient queries
SimulationSchema.index({ tenantId: 1, status: 1 });
SimulationSchema.index({ tenantId: 1, createdAt: -1 });
SimulationSchema.index({ 'config.timeHorizon.start': 1, 'config.timeHorizon.end': 1 });

// Virtual for id
SimulationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Pre-save middleware
SimulationSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === SimulationStatus.RUNNING && !this.startedAt) {
      this.startedAt = new Date();
    }
    if (
      this.status === SimulationStatus.COMPLETED ||
      this.status === SimulationStatus.FAILED ||
      this.status === SimulationStatus.CANCELLED
    ) {
      this.completedAt = new Date();
    }
  }
  next();
});

// Static methods
SimulationSchema.statics.findByTenant = function (
  tenantId: string,
  options: {
    status?: SimulationStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  const query: Record<string, unknown> = { tenantId };
  if (options.status) {
    query.status = options.status;
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options.offset || 0)
    .limit(options.limit || 50);
};

SimulationSchema.statics.countByTenant = function (
  tenantId: string,
  options: { status?: SimulationStatus } = {}
) {
  const query: Record<string, unknown> = { tenantId };
  if (options.status) {
    query.status = options.status;
  }
  return this.countDocuments(query);
};

export const SimulationModel = mongoose.model<SimulationDocument>('Simulation', SimulationSchema);
