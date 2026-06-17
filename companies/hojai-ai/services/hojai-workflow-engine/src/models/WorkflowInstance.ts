import mongoose, { Document, Schema } from 'mongoose';

export type InstanceStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface IStepExecution {
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  retryCount: number;
}

export interface IWorkflowInstance extends Document {
  instanceId: string;
  workflowId: string;
  workflowName: string;
  status: InstanceStatus;
  currentStep?: string;
  context: Record<string, any>;
  executionHistory: IStepExecution[];
  startedAt?: Date;
  completedAt?: Date;
  triggeredBy: string;
  triggeredByType: 'event' | 'schedule' | 'manual' | 'api';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StepExecutionSchema = new Schema<IStepExecution>(
  {
    stepId: { type: String, required: true },
    stepName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    input: { type: Schema.Types.Mixed },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
    retryCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const WorkflowInstanceSchema = new Schema<IWorkflowInstance>(
  {
    instanceId: { type: String, required: true, unique: true, index: true },
    workflowId: { type: String, required: true, index: true },
    workflowName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled', 'paused'],
      default: 'pending',
    },
    currentStep: { type: String },
    context: { type: Schema.Types.Mixed, default: {} },
    executionHistory: { type: [StepExecutionSchema], default: [] },
    startedAt: { type: Date },
    completedAt: { type: Date },
    triggeredBy: { type: String, required: true },
    triggeredByType: {
      type: String,
      enum: ['event', 'schedule', 'manual', 'api'],
      required: true,
    },
    error: { type: String },
  },
  { timestamps: true }
);

WorkflowInstanceSchema.index({ status: 1, createdAt: -1 });
WorkflowInstanceSchema.index({ workflowId: 1, status: 1 });

export const WorkflowInstance = mongoose.model<IWorkflowInstance>(
  'WorkflowInstance',
  WorkflowInstanceSchema
);
