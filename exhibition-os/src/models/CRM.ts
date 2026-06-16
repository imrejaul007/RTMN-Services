/**
 * CRM Models
 * Deal pipeline, Activities
 */

import mongoose, { Schema, Document } from 'mongoose';

// Deal
export interface IDeal extends Document {
  _id: mongoose.Types.ObjectId;
  deal_id: string;
  exhibitor_id: string;
  lead_id: string;
  company_name: string;
  contact_name: string;
  value: number;
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  expected_close: Date;
  notes: string;
  activities: Array<{
    id: string;
    type: 'call' | 'email' | 'meeting' | 'note';
    content: string;
    outcome?: string;
    created_at: Date;
  }>;
  created_at: Date;
  updated_at: Date;
}

const DealSchema = new Schema<IDeal>({
  deal_id: { type: String, required: true, unique: true, index: true },
  exhibitor_id: { type: String, required: true, index: true },
  lead_id: { type: String, required: true, index: true },
  company_name: { type: String, required: true },
  contact_name: { type: String, required: true },
  value: { type: Number, default: 0 },
  stage: {
    type: String,
    enum: ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'lead',
    index: true,
  },
  probability: { type: Number, default: 10 },
  expected_close: { type: Date },
  notes: { type: String, default: '' },
  activities: [{
    id: String,
    type: String,
    content: String,
    outcome: String,
    created_at: { type: Date, default: Date.now },
  }],
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

DealSchema.index({ exhibitor_id: 1, stage: 1 });
DealSchema.index({ lead_id: 1 }, { unique: true });

export const Deal = mongoose.model<IDeal>('Deal', DealSchema);

// Email Sequence
export interface IEmailSequence extends Document {
  _id: mongoose.Types.ObjectId;
  sequence_id: string;
  exhibitor_id: string;
  name: string;
  trigger: 'manual' | 'lead_captured' | 'deal_stage_change';
  steps: Array<{
    day: number;
    subject: string;
    body: string;
    type: 'email' | 'whatsapp' | 'sms';
    sent: number;
  }>;
  enrolled_count: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: Date;
}

const EmailSequenceSchema = new Schema<IEmailSequence>({
  sequence_id: { type: String, required: true, unique: true, index: true },
  exhibitor_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  trigger: {
    type: String,
    enum: ['manual', 'lead_captured', 'deal_stage_change'],
    default: 'manual',
  },
  steps: [{
    day: Number,
    subject: String,
    body: String,
    type: { type: String, enum: ['email', 'whatsapp', 'sms'] },
    sent: { type: Number, default: 0 },
  }],
  enrolled_count: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft',
  },
  created_at: { type: Date, default: Date.now },
});

EmailSequenceSchema.index({ exhibitor_id: 1, status: 1 });

export const EmailSequence = mongoose.model<IEmailSequence>('EmailSequence', EmailSequenceSchema);
