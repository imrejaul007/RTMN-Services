/**
 * Alert Model - Mongoose schema for SLA alerts
 */

import mongoose, { Document, Schema } from 'mongoose';

import { SLAType, SLAPriority } from './SLA';

export enum AlertType {
  WARNING = 'warning',
  BREACH = 'breach',
  MET = 'met',
  CUSTOM = 'custom',
}

export enum AlertChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook',
  DASHBOARD = 'dashboard',
}

export enum AlertStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  ACKNOWLEDGED = 'acknowledged',
}

export interface IAlert extends Document {
  alertId: string;
  slaId: string;
  ticketId: string;
  type: AlertType;
  channel: AlertChannel;
  status: AlertStatus;
  recipient: string;
  subject: string;
  message: string;
  sentAt?: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  errorMessage?: string;
  retryCount: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const alertSchema = new Schema<IAlert>(
  {
    alertId: { type: String, required: true, unique: true, index: true },
    slaId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: Object.values(AlertType),
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(AlertChannel),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(AlertStatus),
      default: AlertStatus.PENDING,
      index: true,
    },
    recipient: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: Date,
    acknowledgedAt: Date,
    acknowledgedBy: String,
    errorMessage: String,
    retryCount: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  }
);

// Indexes
alertSchema.index({ slaId: 1, type: 1 });
alertSchema.index({ status: 1, createdAt: -1 });
alertSchema.index({ ticketId: 1, createdAt: -1 });

export const Alert = mongoose.model<IAlert>('Alert', alertSchema);
export default Alert;