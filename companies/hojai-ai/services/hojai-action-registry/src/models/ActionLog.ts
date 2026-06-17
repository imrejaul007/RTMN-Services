import mongoose, { Document, Schema } from 'mongoose';

export type LogStatus = 'success' | 'failure' | 'partial';
export type ExecutionMode = 'sync' | 'async';

export interface IActionLog extends Document {
  logId: string;
  actionId: string;
  actionName: string;
  agentId?: string;
  agentName?: string;
  workflowId?: string;
  workflowInstanceId?: string;
  status: LogStatus;
  mode: ExecutionMode;
  input: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  errorDetails?: Record<string, any>;
  duration: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    actionId: { type: String, required: true, index: true },
    actionName: { type: String, required: true },
    agentId: { type: String, index: true },
    agentName: { type: String },
    workflowId: { type: String, index: true },
    workflowInstanceId: { type: String, index: true },
    status: {
      type: String,
      enum: ['success', 'failure', 'partial'],
      required: true,
    },
    mode: {
      type: String,
      enum: ['sync', 'async'],
      default: 'sync',
    },
    input: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed },
    error: { type: String },
    errorDetails: { type: Schema.Types.Mixed },
    duration: { type: Number, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ actionId: 1, createdAt: -1 });
ActionLogSchema.index({ agentId: 1, createdAt: -1 });
ActionLogSchema.index({ status: 1, createdAt: -1 });
ActionLogSchema.index({ workflowId: 1, workflowInstanceId: 1 });

ActionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const ActionLog = mongoose.model<IActionLog>('ActionLog', ActionLogSchema);

export async function getActionStats(
  actionId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<any> {
  const match: any = {};
  if (actionId) match.actionId = actionId;
  if (startDate || endDate) {
    match.createdAt = {};
    if (startDate) match.createdAt.$gte = startDate;
    if (endDate) match.createdAt.$lte = endDate;
  }

  const stats = await ActionLog.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$actionId',
        actionName: { $first: '$actionName' },
        totalExecutions: { $sum: 1 },
        successfulExecutions: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        failedExecutions: {
          $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] },
        },
        partialExecutions: {
          $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] },
        },
        avgDuration: { $avg: '$duration' },
        minDuration: { $min: '$duration' },
        maxDuration: { $max: '$duration' },
      },
    },
    {
      $project: {
        _id: 0,
        actionId: '$_id',
        actionName: 1,
        totalExecutions: 1,
        successfulExecutions: 1,
        failedExecutions: 1,
        partialExecutions: 1,
        successRate: {
          $multiply: [
            { $divide: ['$successfulExecutions', { $max: ['$totalExecutions', 1] }] },
            100,
          ],
        },
        avgDurationMs: { $round: ['$avgDuration', 2] },
        minDurationMs: 1,
        maxDurationMs: 1,
      },
    },
    { $sort: { totalExecutions: -1 } },
  ]);

  return stats;
}
