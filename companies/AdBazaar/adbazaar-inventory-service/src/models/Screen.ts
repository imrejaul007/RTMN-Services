/**
 * Screen Model
 *
 * Represents a DOOH screen/display asset
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// TYPES
// ============================================================================

export interface IScreen extends Document {
  screenId: string;
  name: string;
  type: ScreenType;
  networkType: NetworkType;
  ownerId: string;
  ownerType: 'partner' | 'adBazaar' | 'media_owner';
  status: 'active' | 'inactive' | 'maintenance' | 'pending';
  location: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    area: string;
    landmark?: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  };
  specifications: {
    width: number;
    height: number;
    orientation: 'landscape' | 'portrait' | 'square';
    resolution: string;
    screenSize: number; // inches
  };
  audience: {
    dailyFootfall: number;
    peakHours: number[];
    avgDwellTime: number; // seconds
    demographics: {
      ageGroups: { range: string; percentage: number }[];
      genderSplit: { male: number; female: number };
    };
  };
  pricing: {
    cpm: number; // Cost per 1000 impressions
    minBookingHours: number;
    formats: ('image' | 'video' | 'interactive')[];
  };
  media: {
    formats: string[];
    maxDuration: number; // seconds for video
    isHD: boolean;
    hasAudio: boolean;
  };
  apiKey?: string;
  lastHeartbeat?: Date;
  totalImpressions: number;
  totalScans: number;
  earningsBalance: number;
  earningsPaid: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type ScreenType =
  | 'billboard_digital'
  | 'bus_shelter'
  | 'bus_interior'
  | 'train_display'
  | 'metro_screen'
  | 'flight_seatback'
  | 'flight_overhead'
  | 'airport_display'
  | 'airport_kiosk'
  | 'airport_gate'
  | 'airport_lounge'
  | 'airport_billboard'
  | 'restaurant_tv'
  | 'hotel_lobby'
  | 'hotel_room'
  | 'mall_kiosk'
  | 'mall_directory'
  | 'gym_screen'
  | 'salon_display'
  | 'office_lobby'
  | 'office_elevator'
  | 'cab_tablet'
  | 'society_screen'
  | 'clinic_display';

export type NetworkType =
  | 'transit'
  | 'airport'
  | 'retail'
  | 'hospitality'
  | 'office'
  | 'street'
  | 'society';

// ============================================================================
// SCHEMA
// ============================================================================

const screenSchema = new Schema<IScreen>(
  {
    screenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values([
        'billboard_digital', 'bus_shelter', 'bus_interior', 'train_display',
        'metro_screen', 'flight_seatback', 'flight_overhead', 'airport_display',
        'airport_kiosk', 'airport_gate', 'airport_lounge', 'airport_billboard',
        'restaurant_tv', 'hotel_lobby', 'hotel_room', 'mall_kiosk', 'mall_directory',
        'gym_screen', 'salon_display', 'office_lobby', 'office_elevator',
        'cab_tablet', 'society_screen', 'clinic_display'
      ]),
      index: true,
    },
    networkType: {
      type: String,
      enum: ['transit', 'airport', 'retail', 'hospitality', 'office', 'street', 'society'],
      required: true,
      index: true,
    },
    ownerId: {
      type: String,
      required: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ['partner', 'adBazaar', 'media_owner'],
      default: 'partner',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'pending'],
      default: 'pending',
      index: true,
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: { type: String },
      area: { type: String, index: true },
      landmark: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    specifications: {
      width: { type: Number },
      height: { type: Number },
      orientation: { type: String, enum: ['landscape', 'portrait', 'square'] },
      resolution: { type: String },
      screenSize: { type: Number },
    },
    audience: {
      dailyFootfall: { type: Number, default: 0 },
      peakHours: [{ type: Number }],
      avgDwellTime: { type: Number, default: 30 },
      demographics: {
        ageGroups: [{
          range: String,
          percentage: Number,
        }],
        genderSplit: {
          male: { type: Number, default: 50 },
          female: { type: Number, default: 50 },
        },
      },
    },
    pricing: {
      cpm: { type: Number, required: true },
      minBookingHours: { type: Number, default: 1 },
      formats: [{
        type: String,
        enum: ['image', 'video', 'interactive'],
      }],
    },
    media: {
      formats: [{ type: String }],
      maxDuration: { type: Number, default: 30 },
      isHD: { type: Boolean, default: false },
      hasAudio: { type: Boolean, default: false },
    },
    apiKey: { type: String },
    lastHeartbeat: { type: Date },
    totalImpressions: { type: Number, default: 0 },
    totalScans: { type: Number, default: 0 },
    earningsBalance: { type: Number, default: 0 },
    earningsPaid: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'screens',
  }
);

// ============================================================================
// INDEXES
// ============================================================================

screenSchema.index({ 'location.city': 1, status: 1 });
screenSchema.index({ 'location.area': 1, status: 1 });
screenSchema.index({ 'location.coordinates': '2dsphere' });
screenSchema.index({ type: 1, status: 1 });
screenSchema.index({ ownerId: 1, status: 1 });
screenSchema.index({ 'audience.dailyFootfall': -1 });
screenSchema.index({ 'pricing.cpm': 1 });

// ============================================================================
// METHODS
// ============================================================================

screenSchema.methods.updateHeartbeat = function() {
  this.lastHeartbeat = new Date();
  return this.save();
};

screenSchema.methods.recordImpression = function(count: number = 1) {
  this.totalImpressions += count;
  return this.save();
};

screenSchema.methods.recordScan = function(count: number = 1) {
  this.totalScans += count;
  return this.save();
};

// ============================================================================
// MODEL
// ============================================================================

export const ScreenModel = mongoose.model<IScreen>('Screen', screenSchema);
