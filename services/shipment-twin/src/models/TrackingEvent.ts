import mongoose, { Document, Schema } from 'mongoose';
import { ShipmentStatus } from '../types';

// Location in Tracking Event
interface ITrackingLocation {
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

// Tracking Event Document Interface
export interface ITrackingEvent extends Document {
  shipmentId: string;
  tenantId: string;
  carrier: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  previousStatus?: ShipmentStatus;
  location: ITrackingLocation;
  timestamp: Date;
  description: string;
  isDelivered: boolean;
  rawData: Record<string, any>;
  createdAt: Date;
}

// Tracking Event Schema
const TrackingLocationSchema = new Schema<ITrackingLocation>(
  {
    address: String,
    city: String,
    state: String,
    country: String,
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  { _id: false }
);

const TrackingEventSchema = new Schema<ITrackingEvent>(
  {
    shipmentId: {
      type: String,
      required: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    carrier: {
      type: String,
      required: true,
      index: true
    },
    trackingNumber: {
      type: String,
      index: true
    },
    status: {
      type: String,
      required: true,
      enum: [
        'label_created',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'returned',
        'failed',
        'cancelled'
      ],
      index: true
    },
    previousStatus: {
      type: String,
      enum: [
        'label_created',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'returned',
        'failed',
        'cancelled'
      ]
    },
    location: {
      type: TrackingLocationSchema,
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    description: {
      type: String,
      required: true
    },
    isDelivered: {
      type: Boolean,
      default: false,
      index: true
    },
    rawData: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'tracking_events'
  }
);

// Compound indexes
TrackingEventSchema.index({ shipmentId: 1, timestamp: -1 });
TrackingEventSchema.index({ tenantId: 1, createdAt: -1 });
TrackingEventSchema.index({ trackingNumber: 1, timestamp: -1 });

// Static method to get events for shipment
TrackingEventSchema.statics.getForShipment = function (
  shipmentId: string,
  options: { limit?: number } = {}
) {
  return this.find({ shipmentId })
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Static method to get latest event for shipment
TrackingEventSchema.statics.getLatest = function (shipmentId: string) {
  return this.findOne({ shipmentId }).sort({ timestamp: -1 });
};

// Static method to track shipment status changes
TrackingEventSchema.statics.getStatusTimeline = function (shipmentId: string) {
  return this.find({ shipmentId })
    .select('status timestamp description location')
    .sort({ timestamp: 1 });
};

// Static method to get events by carrier
TrackingEventSchema.statics.getByCarrier = function (
  carrier: string,
  options: { startDate?: Date; endDate?: Date; limit?: number } = {}
) {
  const query: any = { carrier };
  if (options.startDate || options.endDate) {
    query.timestamp = {};
    if (options.startDate) query.timestamp.$gte = options.startDate;
    if (options.endDate) query.timestamp.$lte = options.endDate;
  }
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(options.limit || 100);
};

// Index for time-based queries
TrackingEventSchema.index({ createdAt: -1 });

export const TrackingEvent = mongoose.model<ITrackingEvent>(
  'TrackingEvent',
  TrackingEventSchema
);
