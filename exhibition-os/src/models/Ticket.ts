/**
 * Ticket Model
 * Event tickets
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  ticket_id: string;
  attendee_id: string;
  exhibition_id: string;
  ticket_type: 'general' | 'vip' | 'press' | 'speaker' | 'exhibitor';
  price: number;
  currency: string;
  status: 'booked' | 'checked_in' | 'checked_out' | 'cancelled' | 'refunded';
  qr_code: string;
  qr_data: string;
  payment_id?: string;
  booked_at: Date;
  checked_in_at?: Date;
  checked_out_at?: Date;
  metadata?: Record<string, unknown>;
}

const TicketSchema = new Schema<ITicket>({
  ticket_id: { type: String, required: true, unique: true, index: true },
  attendee_id: { type: String, required: true, index: true },
  exhibition_id: { type: String, required: true, index: true },
  ticket_type: {
    type: String,
    enum: ['general', 'vip', 'press', 'speaker', 'exhibitor'],
    default: 'general',
  },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'checked_out', 'cancelled', 'refunded'],
    default: 'booked',
    index: true,
  },
  qr_code: { type: String, default: '' },
  qr_data: { type: String, required: true },
  payment_id: String,
  booked_at: { type: Date, default: Date.now },
  checked_in_at: Date,
  checked_out_at: Date,
  metadata: Schema.Types.Mixed,
});

TicketSchema.index({ exhibition_id: 1, status: 1 });
TicketSchema.index({ attendee_id: 1, exhibition_id: 1 }, { unique: true });

export const Ticket = mongoose.model<ITicket>('Ticket', TicketSchema);
