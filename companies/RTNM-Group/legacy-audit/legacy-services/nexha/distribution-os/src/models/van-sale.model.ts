/**
 * VanSale Model - MongoDB Schema
 */

import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// Schema
// ============================================================================

export interface IVanSale extends Document {
  _id: mongoose.Types.ObjectId;
  saleNumber: string;
  distributorId: mongoose.Types.ObjectId;
  vanId: string;
  driverId: string;
  routeId: string;
  date: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  retailers: Array<{
    retailerId: string;
    retailerName: string;
    address: string;
    visited: boolean;
    visitedAt?: Date;
    order?: {
      orderId: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
      subtotal: number;
      discount: number;
      total: number;
      paymentStatus: 'pending' | 'paid' | 'partial' | 'overdue';
    };
    collection?: {
      amount: number;
      paymentMethod: 'cash' | 'upi' | 'card' | 'credit';
      collectedAt: Date;
    };
  }>;
  inventory: Array<{
    productId: string;
    productName: string;
    openingStock: number;
    sold: number;
    returned: number;
    closingStock: number;
  }>;
  summary: {
    totalRetailers: number;
    retailersVisited: number;
    ordersPlaced: number;
    orderValue: number;
    averageOrderValue: number;
  };
  collectionSummary: {
    totalCollected: number;
    totalTarget: number;
    retailersPaid: number;
    retailersPending: number;
    overdueAmount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VanSaleSchema = new Schema<IVanSale>(
  {
    saleNumber: { type: String, required: true, unique: true, index: true },
    distributorId: { type: Schema.Types.ObjectId, ref: 'Distributor', required: true, index: true },
    vanId: { type: String, required: true },
    driverId: { type: String, required: true },
    routeId: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
      index: true,
    },
    retailers: [{
      retailerId: String,
      retailerName: String,
      address: String,
      visited: { type: Boolean, default: false },
      visitedAt: Date,
      order: {
        orderId: String,
        items: [{
          productId: String,
          productName: String,
          quantity: Number,
          unitPrice: Number,
          total: Number,
        }],
        subtotal: Number,
        discount: Number,
        total: Number,
        paymentStatus: { type: String, enum: ['pending', 'paid', 'partial', 'overdue'] },
      },
      collection: {
        amount: Number,
        paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'credit'] },
        collectedAt: Date,
      },
    }],
    inventory: [{
      productId: String,
      productName: String,
      openingStock: Number,
      sold: Number,
      returned: Number,
      closingStock: Number,
    }],
    summary: {
      totalRetailers: Number,
      retailersVisited: Number,
      ordersPlaced: Number,
      orderValue: Number,
      averageOrderValue: Number,
    },
    collectionSummary: {
      totalCollected: Number,
      totalTarget: Number,
      retailersPaid: Number,
      retailersPending: Number,
      overdueAmount: Number,
    },
  },
  { timestamps: true }
);

VanSaleSchema.pre('save', function (next) {
  if (this.isNew) {
    this.saleNumber = `VS-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

export const VanSale = mongoose.model<IVanSale>('VanSale', VanSaleSchema);
