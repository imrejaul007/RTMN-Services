import mongoose, { Document, Schema } from 'mongoose';
export interface ITask extends Document {
  taskId: string; agentId: string; type: string; description: string;
  input: Record<string, any>; output?: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  result?: any; error?: string; startedAt?: Date; completedAt?: Date;
  orgId: string; clientId: string; createdBy: string;
  createdAt: Date; updatedAt: Date;
}
const TaskSchema = new Schema<ITask>({
  taskId: { type: String, required: true, unique: true, index: true },
  agentId: { type: String, required: true, index: true },
  type: { type: String, required: true }, description: String,
  input: { type: Schema.Types.Mixed, default: {} }, output: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'cancelled'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  result: { type: Schema.Types.Mixed }, error: String, startedAt: Date, completedAt: Date,
  orgId: { type: String, required: true, index: true }, clientId: { type: String, required: true, index: true },
  createdBy: { type: String, required: true, index: true }
}, { timestamps: true });
TaskSchema.index({ orgId: 1, clientId: 1, status: 1 });
export const Task = mongoose.model<ITask>('Task', TaskSchema);
