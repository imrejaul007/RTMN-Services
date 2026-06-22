/**
 * History Model - Mongoose schema for escalation history
 */

import mongoose, { Document, Schema } from 'mongoose';

import { EscalationLevel, EscalationReason, EscalationStatus } from './Escalation';

export interface IHistory extends Document {
  historyId: string;
  escalationId: string;
  ticketId: string;
  fromLevel: EscalationLevel;
  toLevel: EscalationLevel;
  reason: EscalationReason;
  status: EscalationStatus;
  changedBy: string;
  changeReason: string;
  notes: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

const historySchema = new Schema<IHistory>(
  {
    historyId: { type: String, required: true, unique: true, index: true },
    escalationId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    fromLevel: {
      type: String,
      enum: Object.values(EscalationLevel),
      required: true,
    },
    toLevel: {
      type: String,
      enum: Object.values(EscalationLevel),
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(EscalationReason),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(EscalationStatus),
      required: true,
    },
    changedBy: { type: String, required: true },
    changeReason: { type: String, default: '' },
    notes: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
historySchema.index({ ticketId: 1, createdAt: -1 });
historySchema.index({ escalationId: 1, createdAt: -1 });

export const History = mongoose.model<IHistory>('History', historySchema);
export default History;