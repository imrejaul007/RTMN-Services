import mongoose, { Schema, Document } from 'mongoose';

export interface IExecution extends Document {
  playbookId: string;
  customerId: string;
  triggerId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  actionsExecuted: {
    actionOrder: number;
    actionType: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    result?: {
      success: boolean;
      message?: string;
      data?: Record<string, unknown>;
    };
    startedAt?: Date;
    completedAt?: Date;
    duration?: number;
  }[];
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
  triggeredBy: 'automated' | 'manual' | 'api';
  initiatedBy?: string;
  context: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ExecutionSchema = new Schema<IExecution>(
  {
    playbookId: { type: String, required: true, index: true },
    customerId: { type: String, required: true, index: true },
    triggerId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'cancelled'],
      required: true,
      default: 'running',
      index: true,
    },
    actionsExecuted: [{
      actionOrder: { type: Number, required: true },
      actionType: { type: String, required: true },
      status: {
        type: String,
        enum: ['pending', 'running', 'completed', 'failed', 'skipped'],
        required: true,
        default: 'pending',
      },
      result: {
        success: { type: Boolean },
        message: { type: String },
        data: { type: Schema.Types.Mixed },
      },
      startedAt: { type: Date },
      completedAt: { type: Date },
      duration: { type: Number },
    }],
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    duration: { type: Number },
    error: { type: String },
    triggeredBy: {
      type: String,
      enum: ['automated', 'manual', 'api'],
      required: true,
    },
    initiatedBy: { type: String },
    context: { type: Schema.Types.Mixed, default: {} },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    collection: 'playbook_executions',
  }
);

ExecutionSchema.index({ customerId: 1, startedAt: -1 });
ExecutionSchema.index({ playbookId: 1, status: 1 });
ExecutionSchema.index({ status: 1, startedAt: -1 });

export const ExecutionModel = mongoose.model<IExecution>('PlaybookExecution', ExecutionSchema);