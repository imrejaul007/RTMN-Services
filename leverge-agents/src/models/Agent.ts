import mongoose, { Document, Schema } from 'mongoose';
export interface IAgent extends Document {
  agentId: string; name: string; type: 'assistant' | 'analyst' | 'executor' | 'coordinator' | 'specialist';
  description: string; capabilities: string[]; config: Record<string, any>;
  skills: { name: string; level: number; metadata?: any }[];
  memoryEnabled: boolean; twinEnabled: boolean;
  orgId: string; clientId: string; ownerId: string;
  isActive: boolean; status: 'idle' | 'busy' | 'offline'; lastActiveAt: Date;
  metadata: Record<string, any>; createdAt: Date; updatedAt: Date;
}
const AgentSchema = new Schema<IAgent>({
  agentId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['assistant', 'analyst', 'executor', 'coordinator', 'specialist'], required: true },
  description: String, capabilities: [String], config: { type: Schema.Types.Mixed, default: {} },
  skills: [{ name: String, level: Number, metadata: Schema.Types.Mixed }],
  memoryEnabled: { type: Boolean, default: true }, twinEnabled: { type: Boolean, default: false },
  orgId: { type: String, required: true, index: true }, clientId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true }, isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['idle', 'busy', 'offline'], default: 'idle' },
  lastActiveAt: { type: Date, default: Date.now }, metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
AgentSchema.index({ orgId: 1, clientId: 1, status: 1 });
export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);
