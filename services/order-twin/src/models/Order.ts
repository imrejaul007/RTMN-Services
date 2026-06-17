import mongoose, { Document, Schema } from 'mongoose';

// Order Item Interface
export interface IOrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  sku?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

// Pricing Interface
export interface IPricing {
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
}

// Shipping Address Interface
export interface IShippingAddress {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  email?: string;
}

// Shipping Interface
export interface IShipping {
  address: IShippingAddress;
  method: 'standard' | 'express' | 'overnight' | 'same_day' | 'pickup';
  carrier?: string;
  trackingNumber?: string;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  cost: number;
}

// Timeline Event Interface
export interface ITimelineEvent {
  status: string;
  timestamp: Date;
  note?: string;
  updatedBy?: string;
  location?: string;
}

// Order Document Interface
export interface IOrder extends Document {
  orderId: string;
  tenantId: string;
  customerId: string;
  items: IOrderItem[];
  pricing: IPricing;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  shipping: IShipping;
  paymentId?: string;
  paymentMethod?: string;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partial';
  notes?: string;
  internalNotes?: string;
  timeline: ITimelineEvent[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
}

// Order Item Schema
const OrderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    sku: { type: String },
    imageUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

// Shipping Address Schema
const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true, default: 'US' },
    phone: { type: String },
    email: { type: String },
  },
  { _id: false }
);

// Shipping Schema
const ShippingSchema = new Schema<IShipping>(
  {
    address: { type: ShippingAddressSchema, required: true },
    method: {
      type: String,
      enum: ['standard', 'express', 'overnight', 'same_day', 'pickup'],
      required: true,
      default: 'standard'
    },
    carrier: { type: String },
    trackingNumber: { type: String },
    estimatedDelivery: { type: Date },
    actualDelivery: { type: Date },
    cost: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// Timeline Event Schema
const TimelineEventSchema = new Schema<ITimelineEvent>(
  {
    status: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now },
    note: { type: String },
    updatedBy: { type: String },
    location: { type: String },
  },
  { _id: false }
);

// Pricing Schema
const PricingSchema = new Schema<IPricing>(
  {
    subtotal: { type: Number, required: true, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shipping: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Main Order Schema
const OrderSchema = new Schema<IOrder>(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (v: IOrderItem[]) => v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    pricing: {
      type: PricingSchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'],
      default: 'pending',
      index: true,
    },
    shipping: {
      type: ShippingSchema,
      required: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    paymentMethod: {
      type: String,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partial'],
      default: 'pending',
    },
    notes: {
      type: String,
    },
    internalNotes: {
      type: String,
    },
    timeline: {
      type: [TimelineEventSchema],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
OrderSchema.index({ tenantId: 1, customerId: 1 });
OrderSchema.index({ tenantId: 1, status: 1 });
OrderSchema.index({ tenantId: 1, createdAt: -1 });
OrderSchema.index({ 'shipping.trackingNumber': 1 });
OrderSchema.index({ paymentId: 1 });

// Pre-save hook to add initial timeline event
OrderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.timeline = [
      {
        status: 'pending',
        timestamp: new Date(),
        note: 'Order created',
      },
    ];
  }
  next();
});

// Static method to calculate pricing
OrderSchema.statics.calculatePricing = function (items: IOrderItem[], taxRate: number = 0, shippingCost: number = 0, discountAmount: number = 0) {
  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.price * item.quantity;
    return sum + itemTotal - (item.discount || 0);
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + tax + shippingCost - discountAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shipping: shippingCost,
    discount: discountAmount,
    total: Math.round(total * 100) / 100,
  };
};

// Instance method to add timeline event
OrderSchema.methods.addTimelineEvent = function (
  status: string,
  note?: string,
  updatedBy?: string,
  location?: string
) {
  this.timeline.push({
    status,
    timestamp: new Date(),
    note,
    updatedBy,
    location,
  });
  return this;
};

// Instance method to update status
OrderSchema.methods.updateStatus = function (
  status: IOrder['status'],
  note?: string,
  updatedBy?: string
) {
  this.status = status;
  this.addTimelineEvent(status, note, updatedBy);

  if (status === 'delivered') {
    this.shipping.actualDelivery = new Date();
  }

  if (status === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancelledBy = updatedBy;
    this.cancellationReason = note;
  }

  return this;
};

// Export
export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export { OrderItemSchema, ShippingSchema, TimelineEventSchema, PricingSchema };
