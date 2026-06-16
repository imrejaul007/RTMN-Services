/**
 * Lead Model
 * Captured leads at booths
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  lead_id: string;
  exhibitor_id: string;
  booth_id: string;
  exhibition_id: string;
  visitor_id: string;
  visitor_name: string;
  visitor_company: string;
  visitor_title: string;
  visitor_email: string;
  visitor_phone: string;
  visitor_linkedin?: string;
  visitor_city?: string;
  visitor_industry?: string;
  interests: string[];
  intent_level: 'hot' | 'warm' | 'cold';
  notes: string;
  follow_up_status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  follow_up_date?: Date;
  demo_booked: boolean;
  estimated_value?: number;
  source: 'badge_scan' | 'manual' | 'form' | 'chatbot' | 'whatsapp';
  quality_score: number; // 0-100, AI-calculated
  captured_at: Date;
  updated_at: Date;
  // Enrichment data
  enrichment?: {
    company_size?: string;
    company_revenue?: string;
    linkedin_profile?: string;
    twitter_handle?: string;
    enriched_at?: Date;
  };
}

const LeadSchema = new Schema<ILead>(
  {
    lead_id: { type: String, required: true, unique: true, index: true },
    exhibitor_id: { type: String, required: true, index: true },
    booth_id: { type: String, required: true, index: true },
    exhibition_id: { type: String, required: true, index: true },
    visitor_id: { type: String, index: true },
    visitor_name: { type: String, required: true },
    visitor_company: { type: String, default: '' },
    visitor_title: { type: String, default: '' },
    visitor_email: { type: String, index: true },
    visitor_phone: { type: String, default: '' },
    visitor_linkedin: String,
    visitor_city: String,
    visitor_industry: String,
    interests: [String],
    intent_level: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
      default: 'warm',
      index: true,
    },
    notes: { type: String, default: '' },
    follow_up_status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'converted', 'lost'],
      default: 'new',
      index: true,
    },
    follow_up_date: Date,
    demo_booked: { type: Boolean, default: false },
    estimated_value: Number,
    source: {
      type: String,
      enum: ['badge_scan', 'manual', 'form', 'chatbot', 'whatsapp'],
      default: 'manual',
    },
    quality_score: { type: Number, default: 50, min: 0, max: 100 },
    enrichment: {
      company_size: String,
      company_revenue: String,
      linkedin_profile: String,
      twitter_handle: String,
      enriched_at: Date,
    },
  },
  {
    timestamps: { createdAt: 'captured_at', updatedAt: 'updated_at' },
  }
);

// Compound indexes for common queries
LeadSchema.index({ exhibitor_id: 1, intent_level: 1 });
LeadSchema.index({ exhibitor_id: 1, follow_up_status: 1 });
LeadSchema.index({ exhibition_id: 1, captured_at: -1 });
LeadSchema.index({ visitor_email: 1 }, { sparse: true });

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
