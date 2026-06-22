/**
 * Escalation Model - Mongoose schema for ticket escalations
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum EscalationLevel {
  LEVEL_1 = 'level_1',
  LEVEL_2 = 'level_2',
  LEVEL_3 = 'level_3',
  MANAGEMENT = 'management',
  EXECUTIVE = 'executive',
}

export enum EscalationReason {
  SLA_BREACH = 'sla_breach',
  CUSTOMER_REQUEST = 'customer_request',
  COMPLEXITY = 'complexity',
  PRIORITY = 'priority',
  REASSIGNMENT = 'reassignment',
  MANUAL = 'manual',
}

export enum EscalationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CANCELLED = 'cancelled',
}

export interface IEscalation extends Document {
  escalationId: string;
  ticketId: string;
  currentLevel: EscalationLevel;
  targetLevel: EscalationLevel;
  reason: EscalationReason;
  status: EscalationStatus;
  triggeredBy: string;
  assignedTo?: string;
  assignedTeam?: string;
  notes: string;
  metadata: Record<string, unknown>;
  escalatedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const escalationSchema = new Schema<IEscalation>(
  {
    escalationId: { type: String, required: true, unique: true, index: true },
    ticketId: { type: String, required: true, index: true },
    currentLevel: {
      type: String,
      enum: Object.values(EscalationLevel),
      required: true,
    },
    targetLevel: {
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
      default: EscalationStatus.PENDING,
      index: true,
    },
    triggeredBy: { type: String, required: true },
    assignedTo: { type: String, index: true },
    assignedTeam: { type: String, index: true },
    notes: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    escalatedAt: { type: Date, default: Date.now },
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
escalationSchema.index({ ticketId: 1, status: 1 });
escalationSchema.index({ assignedTo: 1, status: 1 });
escalationSchema.index({ escalatedAt: -1 });
escalationSchema.index({ currentLevel: 1, status: 1 });

export const Escalation = mongoose.model<IEscalation>('Escalation', escalationSchema);
export default Escalation;