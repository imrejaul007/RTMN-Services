import mongoose, { Document, Schema } from 'mongoose';
import { ShipmentStatus } from '../types';

// Location History Interface
export interface ILocationHistory {
  location: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  timestamp: Date;
  description?: string;
}

// Proof of Delivery Interface
export interface IProofOfDelivery {
  signature?: string;
  photo?: string;
  otp?: string;
  recipientName?: string;
  deliveredAt?: Date;
}

// Carrier Info Interface
export interface ICarrierInfo {
  code: string;
  name: string;
  trackingUrl?: string;
  trackingNumber?: string;
}

// Shipment Document Interface
export interface IShipment extends Document {
  shipmentId: string;
  tenantId: string;
  orderId: string;
  carrier: ICarrierInfo;
  status: ShipmentStatus;
  origin: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  destination: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  location: {
    current?: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
      coordinates?: {
        lat: number;
        lng: number;
      };
    };
    history: ILocationHistory[];
  };
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  proof: IProofOfDelivery;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Shipment Schema
const LocationSchema = new Schema(
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

const LocationHistorySchema = new Schema(
  {
    location: LocationSchema,
    timestamp: { type: Date, default: Date.now },
    description: String
  },
  { _id: false }
);

const CarrierInfoSchema = new Schema(
  {
    code: { type: String, required: true },
    name: { type: String, required: true },
    trackingUrl: String,
    trackingNumber: String
  },
  { _id: false }
);

const ProofOfDeliverySchema = new Schema(
  {
    signature: String,
    photo: String,
    otp: String,
    recipientName: String,
    deliveredAt: Date
  },
  { _id: false }
);

const DimensionsSchema = new Schema(
  {
    length: Number,
    width: Number,
    height: Number
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    orderId: {
      type: String,
      required: true,
      index: true
    },
    carrier: {
      type: CarrierInfoSchema,
      required: true
    },
    status: {
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
      ],
      default: 'label_created',
      index: true
    },
    origin: {
      type: LocationSchema,
      required: true
    },
    destination: {
      type: LocationSchema,
      required: true
    },
    location: {
      current: LocationSchema,
      history: [LocationHistorySchema]
    },
    weight: Number,
    dimensions: DimensionsSchema,
    estimatedDelivery: Date,
    actualDelivery: Date,
    proof: {
      type: ProofOfDeliverySchema,
      default: {}
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'shipments'
  }
);

// Compound indexes for common queries
ShipmentSchema.index({ tenantId: 1, status: 1 });
ShipmentSchema.index({ tenantId: 1, orderId: 1 });
ShipmentSchema.index({ 'carrier.trackingNumber': 1 });
ShipmentSchema.index({ createdAt: -1 });

// Virtual for checking if shipment is active
ShipmentSchema.virtual('isActive').get(function () {
  return !['delivered', 'returned', 'failed', 'cancelled'].includes(this.status);
});

// Method to add location to history
ShipmentSchema.methods.addLocationUpdate = async function (
  location: any,
  description?: string
) {
  this.location.current = location;
  this.location.history.push({
    location,
    timestamp: new Date(),
    description
  });
  return this.save();
};

// Method to update proof of delivery
ShipmentSchema.methods.setProofOfDelivery = async function (
  proof: Partial<IProofOfDelivery>
) {
  this.proof = {
    ...this.proof,
    ...proof,
    deliveredAt: proof.deliveredAt || new Date()
  };
  this.status = 'delivered';
  this.actualDelivery = new Date();
  return this.save();
};

// Static method to find by tenant
ShipmentSchema.statics.findByTenant = function (
  tenantId: string,
  options: { status?: string; skip?: number; limit?: number } = {}
) {
  const query: any = { tenantId };
  if (options.status) {
    query.status = options.status;
  }
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(options.skip || 0)
    .limit(options.limit || 50);
};

// Static method to get shipment statistics
ShipmentSchema.statics.getStats = async function (tenantId: string) {
  const stats = await this.aggregate([
    { $match: { tenantId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    label_created: 0,
    picked_up: 0,
    in_transit: 0,
    out_for_delivery: 0,
    delivered: 0,
    returned: 0,
    failed: 0,
    cancelled: 0,
    total: 0
  };

  stats.forEach((stat) => {
    result[stat._id as keyof typeof result] = stat.count;
    result.total += stat.count;
  });

  return result;
};

export const Shipment = mongoose.model<IShipment>('Shipment', ShipmentSchema);
