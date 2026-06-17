/**
 * Attendee Model
 * Visitor/Attendee data
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendee extends Document {
  _id: mongoose.Types.ObjectId;
  attendee_id: string;
  exhibition_id: string;
  user_id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  bio?: string;
  avatar_url?: string;
  linkedin_url?: string;
  industry?: string;
  interests: string[];
  intent_purpose: string[];
  badge_id: string;
  ticket_id?: string;
  ticket_type: 'general' | 'vip' | 'press' | 'speaker' | 'exhibitor';
  checkin_status: 'not_arrived' | 'inside' | 'left';
  connections_made: number;
  sessions_attended: number;
  booths_visited: string[];
  coin_balance: number;
  badges_earned: string[];
  created_at: Date;
  updated_at: Date;
}

const AttendeeSchema = new Schema<IAttendee>(
  {
    attendee_id: { type: String, required: true, unique: true, index: true },
    exhibition_id: { type: String, required: true, index: true },
    user_id: { type: String, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String, default: '' },
    company: { type: String, default: '' },
    title: { type: String, default: '' },
    bio: String,
    avatar_url: String,
    linkedin_url: String,
    industry: String,
    interests: [String],
    intent_purpose: [String],
    badge_id: { type: String, required: true, unique: true },
    ticket_id: String,
    ticket_type: {
      type: String,
      enum: ['general', 'vip', 'press', 'speaker', 'exhibitor'],
      default: 'general',
    },
    checkin_status: {
      type: String,
      enum: ['not_arrived', 'inside', 'left'],
      default: 'not_arrived',
      index: true,
    },
    connections_made: { type: Number, default: 0 },
    sessions_attended: { type: Number, default: 0 },
    booths_visited: [String],
    coin_balance: { type: Number, default: 100 },
    badges_earned: [String],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

AttendeeSchema.index({ exhibition_id: 1, checkin_status: 1 });
AttendeeSchema.index({ email: 1, exhibition_id: 1 }, { unique: true });

export const Attendee = mongoose.model<IAttendee>('Attendee', AttendeeSchema);
