/**
 * Area Model
 *
 * Represents a geographic area with audience intelligence
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// TYPES
// ============================================================================

export interface IArea extends Document {
  areaId: string;
  name: string;
  city: string;
  state: string;
  type: AreaType;
  boundaries?: {
    type: string;
    coordinates: number[][];
  };
  center: {
    lat: number;
    lng: number;
  };
  audience: {
    totalPopulation: number;
    workingPopulation: number;
    avgIncome: number;
    dominantAgeGroups: { range: string; percentage: number }[];
    dominantInterests: string[];
  };
  pointsOfInterest: {
    type: string;
    count: number;
    names: string[];
  }[];
  transit: {
    metroStations: number;
    busStops: number;
    autoStand: number;
  };
  business: {
    restaurants: number;
    shops: number;
    offices: number;
    clinics: number;
    gyms: number;
  };
  intentSignals: {
    dining: number;
    retail: number;
    travel: number;
    healthcare: number;
    general: number;
  };
  screenCount: number;
  avgFootfall: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type AreaType =
  | 'residential'
  | 'commercial'
  | 'mixed'
  | 'industrial'
  | 'it_park'
  | 'market'
  | 'transit_hub'
  | 'educational'
  | 'hospital_zone'
  | 'mall_area';

// ============================================================================
// SCHEMA
// ============================================================================

const areaSchema = new Schema<IArea>(
  {
    areaId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      index: true,
    },
    state: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['residential', 'commercial', 'mixed', 'industrial', 'it_park', 'market', 'transit_hub', 'educational', 'hospital_zone', 'mall_area'],
      required: true,
    },
    boundaries: {
      type: {
        type: String,
        enum: ['Polygon'],
        default: 'Polygon',
      },
      coordinates: [[Number]],
    },
    center: {
      lat: { type: Number },
      lng: { type: Number },
    },
    audience: {
      totalPopulation: { type: Number, default: 0 },
      workingPopulation: { type: Number, default: 0 },
      avgIncome: { type: Number, default: 0 },
      dominantAgeGroups: [{
        range: String,
        percentage: Number,
      }],
      dominantInterests: [String],
    },
    pointsOfInterest: [{
      type: String,
      count: Number,
      names: [String],
    }],
    transit: {
      metroStations: { type: Number, default: 0 },
      busStops: { type: Number, default: 0 },
      autoStand: { type: Number, default: 0 },
    },
    business: {
      restaurants: { type: Number, default: 0 },
      shops: { type: Number, default: 0 },
      offices: { type: Number, default: 0 },
      clinics: { type: Number, default: 0 },
      gyms: { type: Number, default: 0 },
    },
    intentSignals: {
      dining: { type: Number, default: 0 },
      retail: { type: Number, default: 0 },
      travel: { type: Number, default: 0 },
      healthcare: { type: Number, default: 0 },
      general: { type: Number, default: 0 },
    },
    screenCount: { type: Number, default: 0 },
    avgFootfall: { type: Number, default: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'areas',
  }
);

// ============================================================================
// INDEXES
// ============================================================================

areaSchema.index({ city: 1, type: 1 });
areaSchema.index({ 'center': '2dsphere' });
areaSchema.index({ 'audience.totalPopulation': -1 });
areaSchema.index({ 'intentSignals.dining': -1 });
areaSchema.index({ 'intentSignals.retail': -1 });

// ============================================================================
// MODEL
// ============================================================================

export const AreaModel = mongoose.model<IArea>('Area', areaSchema);
