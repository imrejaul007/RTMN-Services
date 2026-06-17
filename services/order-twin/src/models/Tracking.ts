import mongoose, { Document, Schema } from 'mongoose';

// Tracking Event Interface
export interface ITrackingEvent {
  status: 'label_created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'attempted_delivery' | 'exception' | 'returned';
  timestamp: Date;
  location?: string;
  description: string;
  rawData?: Record<string, unknown>;
}

// Tracking Document Interface
export interface ITracking extends Document {
  trackingId: string;
  orderId: string;
  tenantId: string;
  carrier: string;
  trackingNumber: string;
  events: ITrackingEvent[];
  currentStatus: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  isActive: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Tracking Event Schema
const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    status: {
      type: String,
      enum: ['label_created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'attempted_delivery', 'exception', 'returned'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    location: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    rawData: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

// Tracking Schema
const TrackingSchema = new Schema<ITracking>(
  {
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    carrier: {
      type: String,
      required: true,
    },
    trackingNumber: {
      type: String,
      required: true,
      index: true,
    },
    events: {
      type: [TrackingEventSchema],
      default: [],
    },
    currentStatus: {
      type: String,
      required: true,
      default: 'label_created',
    },
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastSyncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TrackingSchema.index({ orderId: 1, tenantId: 1 });
TrackingSchema.index({ carrier: 1, trackingNumber: 1 }, { unique: true });
TrackingSchema.index({ currentStatus: 1 });
TrackingSchema.index({ estimatedDelivery: 1 });

// Pre-save hook to add initial event
TrackingSchema.pre('save', function (next) {
  if (this.isNew && this.events.length === 0) {
    this.events.push({
      status: 'label_created',
      timestamp: new Date(),
      description: 'Shipping label created',
    });
    this.currentStatus = 'label_created';
  }
  next();
});

// Instance method to add tracking event
TrackingSchema.methods.addEvent = function (
  status: ITrackingEvent['status'],
  description: string,
  location?: string,
  rawData?: Record<string, unknown>
) {
  this.events.push({
    status,
    timestamp: new Date(),
    location,
    description,
    rawData,
  });
  this.currentStatus = status;

  if (status === 'delivered') {
    this.actualDelivery = new Date();
  }

  return this;
};

// Instance method to sync with carrier
TrackingSchema.methods.syncWithCarrier = async function (carrierApi: unknown) {
  // This would integrate with carrier APIs (UPS, FedEx, USPS, etc.)
  // For now, we just update the lastSync timestamp
  this.lastSyncedAt = new Date();
  return this.save();
};

// Static method to find by tracking number
TrackingSchema.statics.findByTrackingNumber = function (carrier: string, trackingNumber: string) {
  return this.findOne({ carrier, trackingNumber, isActive: true });
};

// Export
export const Tracking = mongoose.model<ITracking>('Tracking', TrackingSchema);
