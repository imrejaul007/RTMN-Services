/**
 * SUTAR Flow OS - MongoDB Models
 * Workflow orchestration, execution, and AI-powered optimization
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// FLOW DEFINITION MODEL
// ============================================================================

export interface IFlowDefinition extends Document {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
  steps: Array<{
    id: string;
    name: string;
    type: 'action' | 'condition' | 'wait' | 'notify' | 'transform';
    config: Record<string, unknown>;
    nextSteps: string[];
    timeout?: number;
    retryPolicy?: {
      maxRetries: number;
      retryDelay: number;
      backoff: 'linear' | 'exponential';
    };
  }>;
  triggers: Array<{
    type: 'manual' | 'scheduled' | 'event' | 'webhook' | 'cron';
    config: Record<string, unknown>;
  }>;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: unknown;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const FlowStepSubSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['action', 'condition', 'wait', 'notify', 'transform'], required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  nextSteps: { type: [String], default: [] },
  timeout: { type: Number },
  retryPolicy: {
    maxRetries: { type: Number, default: 3 },
    retryDelay: { type: Number, default: 1000 },
    backoff: { type: String, enum: ['linear', 'exponential'], default: 'exponential' }
  }
}, { _id: false });

const FlowTriggerSubSchema = new Schema({
  type: { type: String, enum: ['manual', 'scheduled', 'event', 'webhook', 'cron'], required: true },
  config: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

const FlowVariableSubSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['string', 'number', 'boolean', 'object', 'array'], required: true },
  defaultValue: { type: Schema.Types.Mixed }
}, { _id: false });

const FlowDefinitionSchema = new Schema<IFlowDefinition>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String },
  version: { type: Number, default: 1 },
  steps: { type: [FlowStepSubSchema], required: true },
  triggers: { type: [FlowTriggerSubSchema], default: [] },
  variables: { type: [FlowVariableSubSchema], default: [] },
  createdBy: { type: String, required: true }
}, { timestamps: true });

FlowDefinitionSchema.index({ tenantId: 1, name: 1 });
FlowDefinitionSchema.index({ tenantId: 1, createdAt: -1 });
FlowDefinitionSchema.index({ tenantId: 1, 'steps.type': 1 });

export const FlowDefinitionModel = mongoose.model<IFlowDefinition>('FlowDefinition', FlowDefinitionSchema);

// ============================================================================
// FLOW RUN MODEL
// ============================================================================

export interface IFlowRun extends Document {
  id: string;
  tenantId: string;
  flowId: string;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  currentStepId?: string;
  context: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  triggeredBy: string;
  triggeredById?: string;
  createdAt: Date;
}

const FlowRunSchema = new Schema<IFlowRun>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  flowId: { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'paused', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  currentStepId: { type: String },
  context: { type: Schema.Types.Mixed, default: {} },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  error: { type: String },
  triggeredBy: { type: String, default: 'manual' },
  triggeredById: { type: String }
}, { timestamps: true });

FlowRunSchema.index({ tenantId: 1, flowId: 1, status: 1 });
FlowRunSchema.index({ tenantId: 1, createdAt: -1 });
FlowRunSchema.index({ tenantId: 1, status: 1, createdAt: -1 });
FlowRunSchema.index({ flowId: 1, createdAt: -1 });

export const FlowRunModel = mongoose.model<IFlowRun>('FlowRun', FlowRunSchema);

// ============================================================================
// FLOW STEP EXECUTION MODEL
// ============================================================================

export interface IFlowStep extends Document {
  id: string;
  tenantId: string;
  runId: string;
  flowId: string;
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input: unknown;
  output?: unknown;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
}

const FlowStepExecutionSchema = new Schema<IFlowStep>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  runId: { type: String, required: true, index: true },
  flowId: { type: String, required: true, index: true },
  stepId: { type: String, required: true },
  stepName: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
    default: 'pending'
  },
  input: { type: Schema.Types.Mixed },
  output: { type: Schema.Types.Mixed },
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  error: { type: String },
  retryCount: { type: Number, default: 0 }
}, { timestamps: true });

FlowStepExecutionSchema.index({ tenantId: 1, runId: 1 });
FlowStepExecutionSchema.index({ tenantId: 1, flowId: 1, stepId: 1 });
FlowStepExecutionSchema.index({ runId: 1, status: 1 });

export const FlowStepModel = mongoose.model<IFlowStep>('FlowStep', FlowStepExecutionSchema);

// ============================================================================
// FLOW TRIGGER MODEL
// ============================================================================

export interface IFlowTrigger extends Document {
  id: string;
  tenantId: string;
  flowId: string;
  type: 'manual' | 'scheduled' | 'event' | 'webhook' | 'cron';
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  lastTriggeredAt?: Date;
  createdAt: Date;
}

const FlowTriggerRecordSchema = new Schema<IFlowTrigger>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  flowId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['manual', 'scheduled', 'event', 'webhook', 'cron'],
    required: true
  },
  name: { type: String, required: true },
  config: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: { type: Date }
}, { timestamps: true });

FlowTriggerRecordSchema.index({ tenantId: 1, flowId: 1 });
FlowTriggerRecordSchema.index({ tenantId: 1, type: 1, isActive: 1 });
FlowTriggerRecordSchema.index({ tenantId: 1, isActive: 1, type: 1 });

export const FlowTriggerModel = mongoose.model<IFlowTrigger>('FlowTrigger', FlowTriggerRecordSchema);

// ============================================================================
// FLOW ANALYTICS MODEL
// ============================================================================

export interface IStepAnalytics {
  stepId: string;
  avgDuration: number;
  failureRate: number;
  avgRetries: number;
  totalExecutions: number;
}

export interface IFlowAnalytics extends Document {
  id: string;
  tenantId: string;
  flowId: string;
  period: {
    start: Date;
    end: Date;
  };
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  avgDuration: number;
  successRate: number;
  stepAnalytics: IStepAnalytics[];
  recordedAt: Date;
}

const StepAnalyticsSubSchema = new Schema({
  stepId: { type: String, required: true },
  avgDuration: { type: Number, default: 0 },
  failureRate: { type: Number, default: 0 },
  avgRetries: { type: Number, default: 0 },
  totalExecutions: { type: Number, default: 0 }
}, { _id: false });

const FlowAnalyticsSchema = new Schema<IFlowAnalytics>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  flowId: { type: String, required: true, index: true },
  period: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  totalRuns: { type: Number, default: 0 },
  completedRuns: { type: Number, default: 0 },
  failedRuns: { type: Number, default: 0 },
  avgDuration: { type: Number, default: 0 },
  successRate: { type: Number, default: 0 },
  stepAnalytics: { type: [StepAnalyticsSubSchema], default: [] },
  recordedAt: { type: Date, default: Date.now }
}, { timestamps: true });

FlowAnalyticsSchema.index({ tenantId: 1, flowId: 1, 'period.start': -1 });
FlowAnalyticsSchema.index({ tenantId: 1, recordedAt: -1 });

export const FlowAnalyticsModel = mongoose.model<IFlowAnalytics>('FlowAnalytics', FlowAnalyticsSchema);

// ============================================================================
// FLOW BOTTLENECK MODEL
// ============================================================================

export interface IFlowBottleneck extends Document {
  id: string;
  tenantId: string;
  flowId: string;
  stepId: string;
  description: string;
  avgWaitTime: number;
  failureRate: number;
  suggestion: string;
  createdAt: Date;
}

const FlowBottleneckSchema = new Schema<IFlowBottleneck>({
  id: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  flowId: { type: String, required: true, index: true },
  stepId: { type: String, required: true },
  description: { type: String, required: true },
  avgWaitTime: { type: Number, default: 0 },
  failureRate: { type: Number, default: 0 },
  suggestion: { type: String, required: true }
}, { timestamps: true });

FlowBottleneckSchema.index({ tenantId: 1, flowId: 1 });
FlowBottleneckSchema.index({ tenantId: 1, failureRate: -1 });

export const FlowBottleneckModel = mongoose.model<IFlowBottleneck>('FlowBottleneck', FlowBottleneckSchema);

// ============================================================================
// EXPORTS
// ============================================================================

export const models = {
  FlowDefinition: FlowDefinitionModel,
  FlowRun: FlowRunModel,
  FlowStep: FlowStepModel,
  FlowTrigger: FlowTriggerModel,
  FlowAnalytics: FlowAnalyticsModel,
  FlowBottleneck: FlowBottleneckModel
};

export default models;
