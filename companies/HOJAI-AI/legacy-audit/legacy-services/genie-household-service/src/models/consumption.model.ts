/**
 * GENIE Household Service - Consumption Tracking Models
 * FreshMart 7AM Story: "Genie notices Karim's household is low on milk, eggs, vegetables"
 *
 * Purpose: Track household grocery consumption and detect when items are running low
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Household Inventory Item Model
// Tracks current stock levels of grocery items in a household
// ============================================================================

export interface IHouseholdInventoryItem extends Document {
  household_id: string;
  user_id: string;
  sku: string;
  name: string;
  category: 'dairy' | 'produce' | 'bakery' | 'beverages' | 'snacks' | 'household' | 'personal_care' | 'grains' | 'meat' | 'frozen' | 'other';
  current_quantity: number;
  unit: 'pieces' | 'liters' | 'kg' | 'grams' | 'packets' | 'boxes' | 'bottles' | 'cans';
  reorder_threshold: number;
  reorder_quantity: number;
  last_purchased?: Date;
  last_consumed?: Date;
  typical_consumption_rate: number;  // per day
  days_until_empty: number;  // calculated
  status: 'well_stocked' | 'running_low' | 'critical' | 'out_of_stock';
  preferred_store?: string;
  preferred_brand?: string;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const HouseholdInventoryItemSchema = new Schema<IHouseholdInventoryItem>(
  {
    household_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['dairy', 'produce', 'bakery', 'beverages', 'snacks', 'household', 'personal_care', 'grains', 'meat', 'frozen', 'other'],
      default: 'other'
    },
    current_quantity: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['pieces', 'liters', 'kg', 'grams', 'packets', 'boxes', 'bottles', 'cans'],
      default: 'pieces'
    },
    reorder_threshold: { type: Number, default: 2 },  // days of supply
    reorder_quantity: { type: Number, default: 1 },
    last_purchased: { type: Date },
    last_consumed: { type: Date },
    typical_consumption_rate: { type: Number, default: 1 },  // per day
    days_until_empty: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['well_stocked', 'running_low', 'critical', 'out_of_stock'],
      default: 'well_stocked'
    },
    preferred_store: { type: String },
    preferred_brand: { type: String },
    tenant_id: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

// Compound indexes
HouseholdInventoryItemSchema.index({ tenant_id: 1, household_id: 1, status: 1 });
HouseholdInventoryItemSchema.index({ tenant_id: 1, household_id: 1, category: 1 });
HouseholdInventoryItemSchema.index({ tenant_id: 1, user_id: 1, status: 1 });

// Calculate days until empty and status
HouseholdInventoryItemSchema.pre('save', function(next) {
  if (this.typical_consumption_rate > 0) {
    this.days_until_empty = Math.floor(this.current_quantity / this.typical_consumption_rate);

    if (this.current_quantity === 0) {
      this.status = 'out_of_stock';
    } else if (this.days_until_empty <= 1) {
      this.status = 'critical';
    } else if (this.days_until_empty <= this.reorder_threshold) {
      this.status = 'running_low';
    } else {
      this.status = 'well_stocked';
    }
  }
  next();
});

export const HouseholdInventoryItem = mongoose.model<IHouseholdInventoryItem>('HouseholdInventoryItem', HouseholdInventoryItemSchema);

// ============================================================================
// Consumption Log Model
// Tracks each consumption event for pattern analysis
// ============================================================================

export interface IConsumptionLog extends Document {
  household_id: string;
  user_id: string;
  sku: string;
  name: string;
  category: string;
  quantity_consumed: number;
  unit: string;
  source: 'manual' | 'smart_device' | 'order' | 'replenishment';
  context?: {
    meal?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    occasion?: string;
    weather?: string;
  };
  tenant_id: string;
  created_at: Date;
}

const ConsumptionLogSchema = new Schema<IConsumptionLog>(
  {
    household_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    quantity_consumed: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    source: {
      type: String,
      enum: ['manual', 'smart_device', 'order', 'replenishment'],
      default: 'manual'
    },
    context: {
      meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
      occasion: { type: String },
      weather: { type: String }
    },
    tenant_id: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

ConsumptionLogSchema.index({ tenant_id: 1, household_id: 1, sku: 1, created_at: -1 });
ConsumptionLogSchema.index({ tenant_id: 1, sku: 1, created_at: -1 });

export const ConsumptionLog = mongoose.model<IConsumptionLog>('ConsumptionLog', ConsumptionLogSchema);

// ============================================================================
// Reorder Suggestion Model
// Generated suggestions for reordering items
// ============================================================================

export interface IReorderSuggestion extends Document {
  household_id: string;
  user_id: string;
  sku: string;
  name: string;
  category: string;
  current_quantity: number;
  days_until_empty: number;
  suggested_quantity: number;
  estimated_cost?: number;
  preferred_store?: string;
  status: 'pending' | 'approved' | 'dismissed' | 'ordered';
  message: string;  // "Milk running low (2 days left). Shall I reorder?"
  action_taken?: 'reordered' | 'dismissed' | 'snoozed';
  action_at?: Date;
  tenant_id: string;
  created_at: Date;
  expires_at: Date;
}

const ReorderSuggestionSchema = new Schema<IReorderSuggestion>(
  {
    household_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    current_quantity: { type: Number, required: true },
    days_until_empty: { type: Number, required: true },
    suggested_quantity: { type: Number, default: 1 },
    estimated_cost: { type: Number },
    preferred_store: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'dismissed', 'ordered'],
      default: 'pending'
    },
    message: { type: String, required: true },
    action_taken: { type: String, enum: ['reordered', 'dismissed', 'snoozed'] },
    action_at: { type: Date },
    tenant_id: { type: String, required: true, index: true },
    expires_at: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) }  // 24 hours
  },
  { timestamps: true }
);

ReorderSuggestionSchema.index({ tenant_id: 1, user_id: 1, status: 1 });
ReorderSuggestionSchema.index({ tenant_id: 1, household_id: 1, created_at: -1 });
ReorderSuggestionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });  // Auto-expire

export const ReorderSuggestion = mongoose.model<IReorderSuggestion>('ReorderSuggestion', ReorderSuggestionSchema);

// ============================================================================
// Consumption Pattern Model
// Analyzes consumption patterns for forecasting
// ============================================================================

export interface IConsumptionPattern extends Document {
  household_id: string;
  user_id: string;
  sku: string;
  name: string;
  category: string;
  daily_average: number;
  weekly_average: number;
  monthly_average: number;
  weekend_average: number;  // Sat-Sun
  weekday_average: number;  // Mon-Fri
  peak_days: string[];  // Days of week with highest consumption
  peak_hours: number[];  // Hours with highest consumption
  weather_impact: {
    rain: number;  // multiplier
    hot: number;
    cold: number;
  };
  festival_impact: {
    [festival: string]: number;  // multiplier
  };
  seasonal_factor: {
    summer: number;
    monsoon: number;
    winter: number;
    spring: number;
  };
  last_calculated: Date;
  tenant_id: string;
  created_at: Date;
  updated_at?: Date;
}

const ConsumptionPatternSchema = new Schema<IConsumptionPattern>(
  {
    household_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true, index: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    daily_average: { type: Number, default: 0 },
    weekly_average: { type: Number, default: 0 },
    monthly_average: { type: Number, default: 0 },
    weekend_average: { type: Number, default: 0 },
    weekday_average: { type: Number, default: 0 },
    peak_days: [{ type: String }],
    peak_hours: [{ type: Number }],
    weather_impact: {
      rain: { type: Number, default: 1.0 },
      hot: { type: Number, default: 1.0 },
      cold: { type: Number, default: 1.0 }
    },
    festival_impact: { type: Schema.Types.Mixed, default: {} },
    seasonal_factor: {
      summer: { type: Number, default: 1.0 },
      monsoon: { type: Number, default: 1.0 },
      winter: { type: Number, default: 1.0 },
      spring: { type: Number, default: 1.0 }
    },
    last_calculated: { type: Date, default: Date.now },
    tenant_id: { type: String, required: true, index: true }
  },
  { timestamps: true }
);

ConsumptionPatternSchema.index({ tenant_id: 1, household_id: 1, sku: 1 }, { unique: true });
ConsumptionPatternSchema.index({ tenant_id: 1, household_id: 1 });

export const ConsumptionPattern = mongoose.model<IConsumptionPattern>('ConsumptionPattern', ConsumptionPatternSchema);

// ============================================================================
// Model Exports
// ============================================================================

export {
  HouseholdInventoryItemSchema,
  ConsumptionLogSchema,
  ReorderSuggestionSchema,
  ConsumptionPatternSchema
};
