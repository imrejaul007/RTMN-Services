/**
 * PRODFLOW - Manufacturing AI Operating System
 * Production-Ready MongoDB Models with Zod Validation
 */

import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

export const ProductSchemaValidation = z.object({
  name: z.string().min(2).max(100),
  sku: z.string().min(2).max(50),
  description: z.string().optional(),
  category: z.string().min(2),
  unitCost: z.number().positive(),
  unitPrice: z.number().positive(),
  stock: z.number().min(0).optional(),
  reorderLevel: z.number().min(0).optional(),
  leadTime: z.number().min(0).optional(),
  isActive: z.boolean().optional()
});

export const OrderSchemaValidation = z.object({
  orderNumber: z.string().min(2).max(50),
  customerName: z.string().min(2).max(100),
  customerContact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional(),
  items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number().positive(),
    unitPrice: z.number().positive(),
    total: z.number().positive()
  })).min(1),
  subtotal: z.number().positive(),
  tax: z.number().min(0).optional(),
  total: z.number().positive(),
  status: z.enum(['pending', 'confirmed', 'in-production', 'completed', 'shipped', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.date()
});

export const InventorySchemaValidation = z.object({
  productId: z.string(),
  quantity: z.number().min(0),
  location: z.string().optional(),
  minStock: z.number().min(0).optional(),
  maxStock: z.number().min(0).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.date().optional()
});

export const QCReportSchemaValidation = z.object({
  orderId: z.string().optional(),
  productId: z.string().optional(),
  inspector: z.string().min(2),
  result: z.enum(['pass', 'fail', 'rework']),
  defects: z.array(z.object({
    type: z.string(),
    severity: z.enum(['critical', 'major', 'minor']),
    description: z.string(),
    quantity: z.number().optional()
  })).optional(),
  measurements: z.record(z.string(), z.number()).optional(),
  notes: z.string().optional()
});

// ============================================
// PRODUCT MODEL
// ============================================

export interface IProduct extends Document {
  name: string;
  sku: string;
  description?: string;
  category: string;
  unitCost: number;
  unitPrice: number;
  stock: number;
  reorderLevel: number;
  leadTime: number;
  isActive: boolean;
  specifications?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, index: true },
  sku: { type: String, required: true, unique: true },
  description: { type: String },
  category: { type: String, required: true, index: true },
  unitCost: { type: Number, required: true, min: 0 },
  unitPrice: { type: Number, required: true, min: 0 },
  stock: { type: Number, default: 0, min: 0 },
  reorderLevel: { type: Number, default: 10, min: 0 },
  leadTime: { type: Number, default: 7, min: 0 },
  isActive: { type: Boolean, default: true },
  specifications: { type: Schema.Types.Mixed }
}, { timestamps: true });

ProductSchema.index({ sku: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ stock: 1 });

// ============================================
// ORDER MODEL
// ============================================

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IOrder extends Document {
  orderNumber: string;
  customerName: string;
  customerContact?: {
    email?: string;
    phone?: string;
  };
  items: IOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'confirmed' | 'in-production' | 'completed' | 'shipped' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  completedAt?: Date;
  shippedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>({
  orderNumber: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerContact: {
    email: { type: String },
    phone: { type: String }
  },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  }],
  subtotal: { type: Number, required: true, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-production', 'completed', 'shipped', 'cancelled'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  dueDate: { type: Date, required: true, index: true },
  completedAt: { type: Date },
  shippedAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ customerName: 1 });
OrderSchema.index({ createdAt: -1 });

// ============================================
// INVENTORY MODEL
// ============================================

export interface IInventory extends Document {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  location: string;
  minStock: number;
  maxStock: number;
  batchNumber?: string;
  expiryDate?: Date;
  lastUpdated: Date;
  transactions: Array<{
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    reason?: string;
    timestamp: Date;
    reference?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, unique: true, index: true },
  quantity: { type: Number, required: true, min: 0 },
  location: { type: String, default: 'Main Warehouse', index: true },
  minStock: { type: Number, default: 10, min: 0 },
  maxStock: { type: Number, default: 100, min: 0 },
  batchNumber: { type: String },
  expiryDate: { type: Date },
  lastUpdated: { type: Date, default: Date.now },
  transactions: [{
    type: { type: String, enum: ['in', 'out', 'adjustment'] },
    quantity: { type: Number, required: true },
    reason: { type: String },
    timestamp: { type: Date, default: Date.now },
    reference: { type: String }
  }]
}, { timestamps: true });

InventorySchema.index({ quantity: 1 });
InventorySchema.index({ 'transactions.timestamp': -1 });

// ============================================
// QC REPORT MODEL
// ============================================

export interface IQCDefect {
  type: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  quantity?: number;
}

export interface IQCReport extends Document {
  orderId?: mongoose.Types.ObjectId;
  productId?: mongoose.Types.ObjectId;
  inspector: string;
  result: 'pass' | 'fail' | 'rework';
  defects: IQCDefect[];
  measurements?: Record<string, number>;
  notes?: string;
  inspectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QCReportSchema = new Schema<IQCReport>({
  orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', index: true },
  inspector: { type: String, required: true },
  result: {
    type: String,
    enum: ['pass', 'fail', 'rework'],
    required: true,
    index: true
  },
  defects: [{
    type: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'major', 'minor'], required: true },
    description: { type: String, required: true },
    quantity: { type: Number }
  }],
  measurements: { type: Map, of: Number },
  notes: { type: String },
  inspectedAt: { type: Date, default: Date.now }
}, { timestamps: true });

QCReportSchema.index({ inspectedAt: -1 });
QCReportSchema.index({ 'defects.severity': 1 });

// ============================================
// EXPORT MODELS
// ============================================

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export const Order = mongoose.model<IOrder>('Order', OrderSchema);
export const Inventory = mongoose.model<IInventory>('Inventory', InventorySchema);
export const QCReport = mongoose.model<IQCReport>('QCReport', QCReportSchema);

export const Models = { Product, Order, Inventory, QCReport };
export default Models;
