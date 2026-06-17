import mongoose, { Document, Schema } from 'mongoose';

export interface IWorkflowStep {
  stepId: string;
  name: string;
  type: 'action' | 'condition' | 'delay' | 'parallel' | 'merge';
  config: Record<string, any>;
  nextStep?: string;
  condition?: string;
  timeout?: number;
  retryCount?: number;
  onError?: string;
}

export interface IWorkflow extends Document {
  workflowId: string;
  name: string;
  description?: string;
  version: string;
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'api';
    config: Record<string, any>;
  };
  steps: IWorkflowStep[];
  variables: Record<string, any>;
  status: 'draft' | 'active' | 'paused' | 'archived';
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkflowStepSchema = new Schema<IWorkflowStep>(
  {
    stepId: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['action', 'condition', 'delay', 'parallel', 'merge'],
      required: true,
    },
    config: { type: Schema.Types.Mixed, default: {} },
    nextStep: { type: String },
    condition: { type: String },
    timeout: { type: Number },
    retryCount: { type: Number, default: 0 },
    onError: { type: String },
  },
  { _id: false }
);

const WorkflowSchema = new Schema<IWorkflow>(
  {
    workflowId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    version: { type: String, default: '1.0.0' },
    trigger: {
      type: {
        type: String,
        enum: ['event', 'schedule', 'manual', 'api'],
        required: true,
      },
      config: { type: Schema.Types.Mixed, default: {} },
    },
    steps: { type: [WorkflowStepSchema], required: true },
    variables: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'archived'],
      default: 'draft',
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

WorkflowSchema.index({ name: 'text', description: 'text' });

export const Workflow = mongoose.model<IWorkflow>('Workflow', WorkflowSchema);
