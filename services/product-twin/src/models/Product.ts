import mongoose, { Document, Schema } from 'mongoose';

// Warranty Types
export enum WarrantyType {
  STANDARD = 'standard',
  EXTENDED = 'extended',
  LIFETIME = 'lifetime',
  NONE = 'none'
}

// Warranty Status
export enum WarrantyStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  VOID = 'void'
}

// Product Status
export enum ProductStatus {
  ACTIVE = 'active',
  DISCONTINUED = 'discontinued',
  RECALLED = 'recalled',
  ARCHIVED = 'archived'
}

// Support Metrics Interface
export interface ISupportMetrics {
  ticketCount: number;
  resolvedTicketCount: number;
  averageResolutionTimeHours: number;
  returnRate: number;
  satisfactionScore: number;
  lastUpdated: Date;
}

// Warranty Interface
export interface IWarranty {
  type: WarrantyType;
  durationMonths: number;
  startDate?: Date;
  endDate?: Date;
  status: WarrantyStatus;
  details?: string;
}

// Related Product Interface
export interface IRelatedProduct {
  productId: mongoose.Types.ObjectId;
  relationshipType: 'alternative' | 'upsell' | 'accessory' | 'complementary';
  strength: number; // 0-1, how strongly related
}

// Product Interface
export interface IProduct extends Document {
  tenantId: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  brand: string;
  manufacturer?: string;
  modelNumber?: string;
  barcode?: string;
  status: ProductStatus;
  warranty: IWarranty;
  supportMetrics: ISupportMetrics;
  relatedProducts: IRelatedProduct[];
  tags: string[];
  images: string[];
  price: {
    base: number;
    currency: string;
    msrp?: number;
  };
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: string;
  };
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Product Schema
const WarrantySchema = new Schema<IWarranty>(
  {
    type: {
      type: String,
      enum: Object.values(WarrantyType),
      default: WarrantyType.STANDARD
    },
    durationMonths: {
      type: Number,
      default: 12
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: Object.values(WarrantyStatus),
      default: WarrantyStatus.ACTIVE
    },
    details: String
  },
  { _id: false }
);

const SupportMetricsSchema = new Schema<ISupportMetrics>(
  {
    ticketCount: {
      type: Number,
      default: 0
    },
    resolvedTicketCount: {
      type: Number,
      default: 0
    },
    averageResolutionTimeHours: {
      type: Number,
      default: 0
    },
    returnRate: {
      type: Number,
      default: 0
    },
    satisfactionScore: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const RelatedProductSchema = new Schema<IRelatedProduct>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    relationshipType: {
      type: String,
      enum: ['alternative', 'upsell', 'accessory', 'complementary'],
      required: true
    },
    strength: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  },
  { _id: false }
);

const PriceSchema = new Schema(
  {
    base: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD'
    },
    msrp: Number
  },
  { _id: false }
);

const DimensionsSchema = new Schema(
  {
    length: Number,
    width: Number,
    height: Number,
    weight: Number,
    unit: {
      type: String,
      default: 'cm'
    }
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      index: 'text'
    },
    description: {
      type: String,
      default: ''
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    subcategory: String,
    brand: {
      type: String,
      required: true,
      index: true
    },
    manufacturer: String,
    modelNumber: String,
    barcode: {
      type: String,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.ACTIVE,
      index: true
    },
    warranty: {
      type: WarrantySchema,
      default: () => ({
        type: WarrantyType.STANDARD,
        durationMonths: 12,
        status: WarrantyStatus.ACTIVE
      })
    },
    supportMetrics: {
      type: SupportMetricsSchema,
      default: () => ({})
    },
    relatedProducts: [RelatedProductSchema],
    tags: [
      {
        type: String,
        index: true
      }
    ],
    images: [String],
    price: {
      type: PriceSchema,
      required: true
    },
    dimensions: DimensionsSchema,
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'products'
  }
);

// Indexes
ProductSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ tenantId: 1, brand: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ tenantId: 1, status: 1 });

// Virtual for calculating warranty expiration
ProductSchema.virtual('warrantyExpiration').get(function () {
  if (this.warranty?.startDate && this.warranty?.durationMonths) {
    const endDate = new Date(this.warranty.startDate);
    endDate.setMonth(endDate.getMonth() + this.warranty.durationMonths);
    return endDate;
  }
  return null;
});

// Method to check if warranty is active
ProductSchema.methods.isWarrantyActive = function (): boolean {
  if (this.warranty.status !== WarrantyStatus.ACTIVE) {
    return false;
  }
  if (!this.warranty.endDate) {
    return true;
  }
  return new Date() < this.warranty.endDate;
};

// Method to update support metrics
ProductSchema.methods.updateSupportMetrics = function (metrics: Partial<ISupportMetrics>) {
  Object.assign(this.supportMetrics, metrics);
  this.supportMetrics.lastUpdated = new Date();
};

// Static method to find by SKU
ProductSchema.statics.findBySku = function (tenantId: string, sku: string) {
  return this.findOne({ tenantId, sku });
};

// Static method to find by barcode
ProductSchema.statics.findByBarcode = function (tenantId: string, barcode: string) {
  return this.findOne({ tenantId, barcode });
};

// Export the model
export const Product = mongoose.model<IProduct>('Product', ProductSchema);
export default Product;
