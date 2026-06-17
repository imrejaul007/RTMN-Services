/**
 * Badge Model
 * QR Badges for attendees
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId;
  badge_id: string;
  attendee_id: string;
  exhibition_id: string;
  type: 'attendee' | 'exhibitor' | 'speaker' | 'press' | 'vip' | 'staff' | 'organizer';
  holder_name: string;
  company: string;
  title: string;
  email: string;
  phone: string;
  qr_data: string;
  qr_image_url?: string;
  wallet_pass_url?: string;
  is_active: boolean;
  issued_at: Date;
  last_used_at?: Date;
  scan_count: number;
  metadata?: Record<string, unknown>;
}

const BadgeSchema = new Schema<IBadge>({
  badge_id: { type: String, required: true, unique: true, index: true },
  attendee_id: { type: String, required: true, index: true },
  exhibition_id: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['attendee', 'exhibitor', 'speaker', 'press', 'vip', 'staff', 'organizer'],
    default: 'attendee',
  },
  holder_name: { type: String, required: true },
  company: { type: String, default: '' },
  title: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  qr_data: { type: String, required: true },
  qr_image_url: String,
  wallet_pass_url: String,
  is_active: { type: Boolean, default: true },
  issued_at: { type: Date, default: Date.now },
  last_used_at: Date,
  scan_count: { type: Number, default: 0 },
  metadata: Schema.Types.Mixed,
});

BadgeSchema.index({ exhibition_id: 1, type: 1 });
BadgeSchema.index({ attendee_id: 1, exhibition_id: 1 }, { unique: true });

export const Badge = mongoose.model<IBadge>('Badge', BadgeSchema);
