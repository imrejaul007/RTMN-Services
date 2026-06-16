/**
 * Exhibitor Model
 * Exhibitor and Booth data
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IExhibitor extends Document {
  _id: mongoose.Types.ObjectId;
  exhibitor_id: string;
  company_id: string;
  exhibition_id: string;
  company_name: string;
  brand_name: string;
  category: string;
  description: string;
  website: string;
  logo_url: string;
  banner_url: string;
  social_links: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
  };
  booth_id?: string;
  contact_person: {
    name: string;
    email: string;
    phone: string;
    designation: string;
  };
  team_members: Array<{
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    permissions: string[];
  }>;
  status: 'pending' | 'approved' | 'active' | 'completed';
  package_type: 'basic' | 'premium' | 'platinum';
  fees_paid: boolean;
  created_at: Date;
  updated_at: Date;
}

const ExhibitorSchema = new Schema<IExhibitor>(
  {
    exhibitor_id: { type: String, required: true, unique: true, index: true },
    company_id: { type: String, required: true, index: true },
    exhibition_id: { type: String, required: true, index: true },
    company_name: { type: String, required: true },
    brand_name: { type: String },
    category: { type: String, required: true, index: true },
    description: { type: String, default: '' },
    website: { type: String, default: '' },
    logo_url: { type: String, default: '' },
    banner_url: { type: String, default: '' },
    social_links: {
      linkedin: String,
      twitter: String,
      instagram: String,
      facebook: String,
      youtube: String,
    },
    booth_id: { type: String, index: true },
    contact_person: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      designation: String,
    },
    team_members: [{
      id: String,
      name: String,
      email: String,
      phone: String,
      role: String,
      permissions: [String],
    }],
    status: {
      type: String,
      enum: ['pending', 'approved', 'active', 'completed'],
      default: 'pending',
      index: true,
    },
    package_type: {
      type: String,
      enum: ['basic', 'premium', 'platinum'],
      default: 'basic',
    },
    fees_paid: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

ExhibitorSchema.index({ exhibition_id: 1, status: 1 });
ExhibitorSchema.index({ category: 1, status: 1 });

export const Exhibitor = mongoose.model<IExhibitor>('Exhibitor', ExhibitorSchema);
