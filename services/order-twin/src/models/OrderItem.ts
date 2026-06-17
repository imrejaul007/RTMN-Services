import mongoose, { Document, Schema } from 'mongoose';

// Order Item Document Interface
export interface IOrderItemDocument extends Document {
  orderId: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  sku?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Order Item Schema
const OrderItemSchema = new Schema<IOrderItemDocument>(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    productId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    sku: {
      type: String,
    },
    imageUrl: {
      type: String,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for order-specific items
OrderItemSchema.index({ orderId: 1, productId: 1 });

// Virtual for line total
OrderItemSchema.virtual('lineTotal').get(function () {
  return (this.price * this.quantity) - (this.discount || 0);
});

// Export
export const OrderItem = mongoose.model<IOrderItemDocument>('OrderItem', OrderItemSchema);
