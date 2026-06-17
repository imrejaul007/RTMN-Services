import mongoose, { Document, Schema } from 'mongoose';
export interface ITwin extends Document {
  twinId: string; type: 'user' | 'agent' | 'business' | 'product' | 'system';
  name: string; description: string; avatar?: string;
  properties: Record<string, any>; state: Record<string, any>;
  relationships: { targetTwinId: string; type: string; metadata?: any }[];
  orgId: string; clientId: string; ownerId: string;
  isActive: boolean; lastSyncedAt: Date;
  metadata: Record<string, any>; createdAt: Date; updatedAt: Date;
}
const TwinSchema = new Schema<ITwin>({
  twinId: { type: String, required: true, unique: true, index: true },
  type: { type: String, enum: ['user', 'agent', 'business', 'product', 'system'], required: true },
  name: { type: String, required: true }, description: String, avatar: String,
  properties: { type: Schema.Types.Mixed, default: {} }, state: { type: Schema.Types.Mixed, default: {} },
  relationships: [{ targetTwinId: String, type: String, metadata: Schema.Types.Mixed }],
  orgId: { type: String, required: true, index: true }, clientId: { type: String, required: true, index: true },
  ownerId: { type: String, required: true, index: true }, isActive: { type: Boolean, default: true },
  lastSyncedAt: { type: Date, default: Date.now }, metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });
TwinSchema.index({ orgId: 1, clientId: 1, type: 1 });
export const Twin = mongoose.model<ITwin>('Twin', TwinSchema);
