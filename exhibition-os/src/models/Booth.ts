/**
 * Booth Model
 * Exhibitor booth data
 */

import mongoose, { Schema, Document } from 'mongoose';

export interface IBooth extends Document {
  _id: mongoose.Types.ObjectId;
  booth_id: string;
  exhibitor_id: string;
  exhibition_id: string;
  zone_id: string;
  zone_name: string;
  booth_number: string;
  size_sqft: number;
  layout_position: { row: number; col: number };
  setup_status: 'not_started' | 'in_progress' | 'ready' | 'live';
  theme?: string;
  amenities: string[];
  product_categories: string[];
  products: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    price?: number;
    images: string[];
    in_stock: boolean;
    is_featured: boolean;
  }>;
  offers: Array<{
    id: string;
    title: string;
    discount_percent?: number;
    coupon_code?: string;
    valid_until?: Date;
    is_active: boolean;
  }>;
  demo_schedule: Array<{
    id: string;
    start_time: string;
    end_time: string;
    max_bookings: number;
    booked_count: number;
  }>;
  live_metrics: {
    visitors_count: number;
    visitors_today: number;
    leads_captured: number;
    hot_leads: number;
    demo_bookings: number;
    badge_scans: number;
    avg_dwell_time_seconds: number;
    peak_hour: string;
    last_updated: Date;
  };
  created_at: Date;
  updated_at: Date;
}

const BoothSchema = new Schema<IBooth>(
  {
    booth_id: { type: String, required: true, unique: true, index: true },
    exhibitor_id: { type: String, required: true, index: true },
    exhibition_id: { type: String, required: true, index: true },
    zone_id: { type: String, required: true },
    zone_name: { type: String, default: 'General' },
    booth_number: { type: String, required: true },
    size_sqft: { type: Number, default: 100 },
    layout_position: {
      row: { type: Number, default: 0 },
      col: { type: Number, default: 0 },
    },
    setup_status: {
      type: String,
      enum: ['not_started', 'in_progress', 'ready', 'live'],
      default: 'not_started',
      index: true,
    },
    theme: String,
    amenities: [String],
    product_categories: [String],
    products: [{
      id: String,
      name: String,
      description: String,
      category: String,
      price: Number,
      images: [String],
      in_stock: { type: Boolean, default: true },
      is_featured: { type: Boolean, default: false },
    }],
    offers: [{
      id: String,
      title: String,
      discount_percent: Number,
      coupon_code: String,
      valid_until: Date,
      is_active: { type: Boolean, default: true },
    }],
    demo_schedule: [{
      id: String,
      start_time: String,
      end_time: String,
      max_bookings: Number,
      booked_count: { type: Number, default: 0 },
    }],
    live_metrics: {
      visitors_count: { type: Number, default: 0 },
      visitors_today: { type: Number, default: 0 },
      leads_captured: { type: Number, default: 0 },
      hot_leads: { type: Number, default: 0 },
      demo_bookings: { type: Number, default: 0 },
      badge_scans: { type: Number, default: 0 },
      avg_dwell_time_seconds: { type: Number, default: 0 },
      peak_hour: { type: String, default: '10:00' },
      last_updated: { type: Date, default: Date.now },
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

BoothSchema.index({ exhibitor_id: 1, exhibition_id: 1 }, { unique: true });
BoothSchema.index({ zone_id: 1, exhibition_id: 1 });

export const Booth = mongoose.model<IBooth>('Booth', BoothSchema);
