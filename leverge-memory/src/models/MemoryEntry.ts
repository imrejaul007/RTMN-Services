import mongoose, { Document, Schema } from 'mongoose';
export interface IMemoryEntry extends Document {
  userId: string; orgId: string; clientId: string;
  type: 'conversation' | 'fact' | 'preference' | 'interaction' | 'context';
  content: string; embedding?: number[];
  metadata: Record<string, any>; importance: number; tags: string[];
  source: string; expiresAt?: Date; createdAt: Date; updatedAt: Date;
}
const MemoryEntrySchema = new Schema<IMemoryEntry>({
  userId: { type: String, required: true, index: true },
  orgId: { type: String, required: true, index: true },
  clientId: { type: String, required: true, index: true },
  type: { type: String, enum: ['conversation', 'fact', 'preference', 'interaction', 'context'], required: true },
  content: { type: String, required: true },
  embedding: [{ type: Number }],
  metadata: { type: Schema.Types.Mixed, default: {} },
  importance: { type: Number, default: 0.5, min: 0, max: 1 },
  tags: [String],
  source: { type: String, default: 'user' },
  expiresAt: { type: Date }
}, { timestamps: true });
MemoryEntrySchema.index({ orgId: 1, clientId: 1, userId: 1 });
export const MemoryEntry = mongoose.model<IMemoryEntry>('MemoryEntry', MemoryEntrySchema);
