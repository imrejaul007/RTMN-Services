import mongoose, { Document, Schema } from 'mongoose';

// Shipping Address Interface
export interface IShippingAddressDocument extends Document {
  orderId: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Shipping Details Interface
export interface IShippingDocument extends Document {
  orderId: string;
  method: 'standard' | 'express' | 'overnight' | 'same_day' | 'pickup';
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  shippingAddress: string; // Reference to ShippingAddress
  cost: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Shipping Address Schema
const ShippingAddressSchema = new Schema<IShippingAddressDocument>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    addressLine1: {
      type: String,
      required: true,
    },
    addressLine2: {
      type: String,
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: 'US',
    },
    phone: {
      type: String,
    },
    email: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Shipping Details Schema
const ShippingDetailsSchema = new Schema<IShippingDocument>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'same_day', 'pickup'],
      required: true,
      default: 'standard',
    },
    carrier: {
      type: String,
    },
    trackingNumber: {
      type: String,
      index: true,
    },
    estimatedDelivery: {
      type: Date,
    },
    actualDelivery: {
      type: Date,
    },
    shippingAddress: {
      type: String,
      required: true,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
ShippingDetailsSchema.index({ carrier: 1, trackingNumber: 1 });
ShippingDetailsSchema.index({ estimatedDelivery: 1 });

// Virtual for delivery status
ShippingDetailsSchema.virtual('deliveryStatus').get(function () {
  if (this.actualDelivery) return 'delivered';
  if (this.estimatedDelivery && new Date() > this.estimatedDelivery) return 'delayed';
  return 'in_transit';
});

// Exports
export const ShippingAddress = mongoose.model<IShippingAddressDocument>('ShippingAddress', ShippingAddressSchema);
export const ShippingDetails = mongoose.model<IShippingDocument>('ShippingDetails', ShippingDetailsSchema);
