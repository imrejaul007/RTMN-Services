/**
 * Ticket Model - Mongoose schema for support tickets
 */

import mongoose, { Document, Schema } from 'mongoose';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  PENDING_CUSTOMER = 'pending_customer',
  PENDING_INTERNAL = 'pending_internal',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  CAMPAIGN = 'campaign',
  SCREEN_OWNER = 'screen_owner',
  ADVERTISER = 'advertiser',
  GENERAL = 'general',
}

export interface ITicket extends Document {
  ticketId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  customerId: string;
  customerEmail: string;
  customerName: string;
  assignedTo?: string;
  assignedTeam?: string;
  tags: string[];
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  sla: {
    firstResponseDue: Date;
    resolutionDue: Date;
    firstResponseAt?: Date;
    resolvedAt?: Date;
    breached: boolean;
    breachedAt?: Date;
  };
  metadata: Record<string, unknown>;
  rating?: number;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

const ticketSchema = new Schema<ITicket>(
  {
    ticketId: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, maxlength: 500 },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(TicketStatus),
      default: TicketStatus.OPEN,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TicketPriority),
      default: TicketPriority.MEDIUM,
      index: true,
    },
    category: {
      type: String,
      enum: Object.values(TicketCategory),
      default: TicketCategory.GENERAL,
      index: true,
    },
    customerId: { type: String, required: true, index: true },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    assignedTo: { type: String, index: true },
    assignedTeam: { type: String, index: true },
    tags: [{ type: String }],
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        size: Number,
      },
    ],
    sla: {
      firstResponseDue: { type: Date, required: true },
      resolutionDue: { type: Date, required: true },
      firstResponseAt: Date,
      resolvedAt: Date,
      breached: { type: Boolean, default: false },
      breachedAt: Date,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    rating: { type: Number, min: 1, max: 5 },
    feedback: String,
    resolvedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, priority: 1 });
ticketSchema.index({ customerId: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
export default Ticket;
