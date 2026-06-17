import mongoose, { Document, Schema } from 'mongoose';

// Part Types
export enum PartType {
  COMPONENT = 'component',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
  REPLACEMENT = 'replacement',
  SPARE = 'spare',
  TOOL = 'tool'
}

// Part Status
export enum PartStatus {
  AVAILABLE = 'available',
  LIMITED = 'limited',
  OUT_OF_STOCK = 'out_of_stock',
  DISCONTINUED = 'discontinued',
  BACKORDERED = 'backordered'
}

// Part Compatibility
export interface IPartCompatibility {
  productId: mongoose.Types.ObjectId;
  productSku?: string;
  versionFrom?: string;
  versionTo?: string;
  isCompatible: boolean;
  notes?: string;
}

// Part Inventory
export interface IPartInventory {
  quantity: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastRestocked?: Date;
}

// Part Price
export interface IPartPrice {
  cost: number;
  retail: number;
  wholesale?: number;
  currency: string;
}

// Part Interface
export interface IPart extends Document {
  tenantId: string;
  sku: string;
  name: string;
  description: string;
  type: PartType;
  status: PartStatus;
  compatibleProducts: IPartCompatibility[];
  inventory: IPartInventory;
  price: IPartPrice;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
    unit: string;
  };
  manufacturer?: string;
  manufacturerPartNumber?: string;
  supplier?: string;
  supplierPartNumber?: string;
  warranty?: {
    durationMonths: number;
    type: string;
  };
  image?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Part Schema
const PartCompatibilitySchema = new Schema<IPartCompatibility>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productSku: String,
    versionFrom: String,
    versionTo: String,
    isCompatible: {
      type: Boolean,
      default: true
    },
    notes: String
  },
  { _id: false }
);

const PartInventorySchema = new Schema<IPartInventory>(
  {
    quantity: {
      type: Number,
      default: 0
    },
    reserved: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: 0
    },
    reorderPoint: {
      type: Number,
      default: 5
    },
    reorderQuantity: {
      type: Number,
      default: 10
    },
    lastRestocked: Date
  },
  { _id: false }
);

const PartPriceSchema = new Schema<IPartPrice>(
  {
    cost: {
      type: Number,
      required: true
    },
    retail: {
      type: Number,
      required: true
    },
    wholesale: Number,
    currency: {
      type: String,
      default: 'USD'
    }
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

const WarrantySchema = new Schema(
  {
    durationMonths: {
      type: Number,
      default: 0
    },
    type: {
      type: String,
      default: 'standard'
    }
  },
  { _id: false }
);

const PartSchema = new Schema<IPart>(
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
    type: {
      type: String,
      enum: Object.values(PartType),
      default: PartType.COMPONENT
    },
    status: {
      type: String,
      enum: Object.values(PartStatus),
      default: PartStatus.AVAILABLE
    },
    compatibleProducts: [PartCompatibilitySchema],
    inventory: {
      type: PartInventorySchema,
      default: () => ({})
    },
    price: {
      type: PartPriceSchema,
      required: true
    },
    dimensions: DimensionsSchema,
    manufacturer: String,
    manufacturerPartNumber: String,
    supplier: String,
    supplierPartNumber: String,
    warranty: WarrantySchema,
    image: String,
    tags: [String],
    metadata: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    collection: 'parts'
  }
);

// Indexes
PartSchema.index({ tenantId: 1, sku: 1 }, { unique: true });
PartSchema.index({ tenantId: 1, type: 1 });
PartSchema.index({ tenantId: 1, status: 1 });
PartSchema.index({ name: 'text', description: 'text' });
PartSchema.index({ tenantId: 1, 'compatibleProducts.productId': 1 });
PartSchema.index({ tenantId: 1, manufacturer: 1 });

// Virtual for checking availability
PartSchema.virtual('isAvailable').get(function () {
  return (
    this.status === PartStatus.AVAILABLE &&
    this.inventory.available > 0
  );
});

// Virtual for low stock alert
PartSchema.virtual('isLowStock').get(function () {
  return this.inventory.available <= this.inventory.reorderPoint;
});

// Method to reserve inventory
PartSchema.methods.reserve = function (quantity: number): boolean {
  if (this.inventory.available >= quantity) {
    this.inventory.reserved += quantity;
    this.inventory.available -= quantity;
    return true;
  }
  return false;
};

// Method to release reserved inventory
PartSchema.methods.releaseReservation = function (quantity: number) {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  this.inventory.available += quantity;
};

// Method to fulfill reserved inventory
PartSchema.methods.fulfillReservation = function (quantity: number) {
  this.inventory.reserved = Math.max(0, this.inventory.reserved - quantity);
  this.inventory.quantity = Math.max(0, this.inventory.quantity - quantity);
};

// Method to restock
PartSchema.methods.restock = function (quantity: number) {
  this.inventory.quantity += quantity;
  this.inventory.available += quantity;
  this.inventory.lastRestocked = new Date();
};

// Static method to find compatible parts for a product
PartSchema.statics.findCompatible = function (
  tenantId: string,
  productId: mongoose.Types.ObjectId
) {
  return this.find({
    tenantId,
    'compatibleProducts.productId': productId,
    'compatibleProducts.isCompatible': true,
    status: { $in: [PartStatus.AVAILABLE, PartStatus.LIMITED] }
  });
};

// Static method to find low stock parts
PartSchema.statics.findLowStock = function (tenantId: string) {
  return this.find({
    tenantId,
    $expr: { $lte: ['$inventory.available', '$inventory.reorderPoint'] },
    status: { $ne: PartStatus.DISCONTINUED }
  });
};

// Static method to find by type
PartSchema.statics.findByType = function (tenantId: string, type: PartType) {
  return this.find({ tenantId, type });
};

// Export the model
export const Part = mongoose.model<IPart>('Part', PartSchema);
export default Part;
