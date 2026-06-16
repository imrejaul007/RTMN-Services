/**
 * Session Model
 * Sessions, talks, workshops
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  session_id: string;
  exhibition_id: string;
  title: string;
  description: string;
  type: 'keynote' | 'panel' | 'workshop' | 'networking' | 'product_launch';
  speaker: {
    id: string;
    name: string;
    title: string;
    company: string;
    bio: string;
    avatar_url: string;
    linkedin_url?: string;
  };
  room: string;
  start_time: Date;
  end_time: Date;
  capacity: number;
  registered_count: number;
  attended_count: number;
  tags: string[];
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    session_id: { type: String, required: true, unique: true, index: true },
    exhibition_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['keynote', 'panel', 'workshop', 'networking', 'product_launch'],
      required: true,
    },
    speaker: {
      id: String,
      name: String,
      title: String,
      company: String,
      bio: String,
      avatar_url: String,
      linkedin_url: String,
    },
    room: { type: String, default: 'Main Hall' },
    start_time: { type: Date, required: true, index: true },
    end_time: { type: Date, required: true },
    capacity: { type: Number, default: 100 },
    registered_count: { type: Number, default: 0 },
    attended_count: { type: Number, default: 0 },
    tags: [String],
    status: {
      type: String,
      enum: ['scheduled', 'live', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

SessionSchema.index({ exhibition_id: 1, start_time: 1 });
SessionSchema.index({ exhibition_id: 1, type: 1 });
SessionSchema.index({ speaker: 1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
