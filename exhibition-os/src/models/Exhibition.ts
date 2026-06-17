/**
 * Exhibition Model
 * Core exhibition data
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExhibition extends Document {
  _id: mongoose.Types.ObjectId;
  exhibition_id: string;
  organizer_id: string;
  name: string;
  tagline: string;
  description: string;
  industry: string;
  venue_id?: string;
  start_date: Date;
  end_date: Date;
  hours: { open: string; close: string }[];
  total_booths: number;
  booths_sold: number;
  exhibitor_count: number;
  expected_visitors: number;
  ticket_price: number;
  status: 'draft' | 'published' | 'live' | 'completed' | 'cancelled';
  tags: string[];
  media: {
    logo: string;
    banner: string;
    gallery: string[];
  };
  settings: {
    enable_passport: boolean;
    enable_marketplace: boolean;
    enable_networking: boolean;
    enable_appointments: boolean;
    enable_lead_capture: boolean;
    coin_budget: number;
    passport_missions: string[];
  };
  sponsors: Array<{
    id: string;
    company_name: string;
    tier: string;
    package_value: number;
  }>;
  created_at: Date;
  updated_at: Date;
}

const ExhibitionSchema = new Schema<IExhibition>(
  {
    exhibition_id: { type: String, required: true, unique: true, index: true },
    organizer_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    industry: { type: String, required: true, index: true },
    venue_id: { type: String },
    start_date: { type: Date, required: true, index: true },
    end_date: { type: Date, required: true },
    hours: [{
      open: { type: String, default: '09:00' },
      close: { type: String, default: '18:00' },
    }],
    total_booths: { type: Number, default: 0 },
    booths_sold: { type: Number, default: 0 },
    exhibitor_count: { type: Number, default: 0 },
    expected_visitors: { type: Number, default: 0 },
    ticket_price: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'published', 'live', 'completed', 'cancelled'],
      default: 'draft',
      index: true,
    },
    tags: [String],
    media: {
      logo: { type: String, default: '' },
      banner: { type: String, default: '' },
      gallery: [String],
    },
    settings: {
      enable_passport: { type: Boolean, default: true },
      enable_marketplace: { type: Boolean, default: true },
      enable_networking: { type: Boolean, default: true },
      enable_appointments: { type: Boolean, default: true },
      enable_lead_capture: { type: Boolean, default: true },
      coin_budget: { type: Number, default: 10000 },
      passport_missions: [String],
    },
    sponsors: [{
      id: String,
      company_name: String,
      tier: String,
      package_value: Number,
    }],
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Indexes
ExhibitionSchema.index({ status: 1, start_date: 1 });
ExhibitionSchema.index({ organizer_id: 1, status: 1 });
ExhibitionSchema.index({ industry: 1, status: 1 });

export const Exhibition = mongoose.model<IExhibition>('Exhibition', ExhibitionSchema);
