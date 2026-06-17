import mongoose, { Document, Schema } from 'mongoose';

// Asset Types
export type AssetType = 'machine' | 'vehicle' | 'device' | 'equipment';

// Asset Status
export type AssetStatus = 'active' | 'inactive' | 'maintenance' | 'decommissioned' | 'sold';

// Asset Categories
export type AssetCategory =
  | 'electronics'
  | 'machinery'
  | 'vehicles'
  | 'furniture'
  | 'it_hardware'
  | 'office_equipment'
  | 'plant_equipment'
  | 'other';

// Interface for Asset Document
export interface IAsset extends Document {
  // Multi-tenant support
  tenantId: string;

  // Basic Info
  assetId: string;
  name: string;
  description?: string;
  assetType: AssetType;
  category: AssetCategory;
  status: AssetStatus;

  // Identification
  serialNumber?: string;
  modelNumber?: string;
  manufacturer?: string;
  brand?: string;

  // Location
  location?: {
    building?: string;
    floor?: string;
    room?: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Assignment
  assignedTo?: {
    department?: string;
    employeeId?: string;
    employeeName?: string;
  };

  // Purchase Info
  purchaseInfo?: {
    purchaseDate?: Date;
    purchaseCost?: number;
    vendor?: string;
    invoiceNumber?: string;
    warrantyExpiry?: Date;
  };

  // Specifications (flexible key-value pairs)
  specifications?: Record<string, string | number | boolean>;

  // Performance Metrics
  metrics?: {
    totalUptime: number;        // Total hours in operation
    totalDowntime: number;      // Total hours not operational
    mtbf: number;               // Mean Time Between Failures (hours)
    mttr: number;               // Mean Time To Repair (hours)
    totalFailures: number;      // Number of failures
    lastFailure?: Date;         // Date of last failure
    lastMaintenance?: Date;     // Date of last maintenance
  };

  // IoT Integration
  iotEnabled: boolean;
  iotDeviceId?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

// Asset Schema
const AssetSchema = new Schema<IAsset>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assetType: {
      type: String,
      enum: ['machine', 'vehicle', 'device', 'equipment'],
      required: true,
    },
    category: {
      type: String,
      enum: [
        'electronics',
        'machinery',
        'vehicles',
        'furniture',
        'it_hardware',
        'office_equipment',
        'plant_equipment',
        'other',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'decommissioned', 'sold'],
      default: 'active',
    },
    serialNumber: String,
    modelNumber: String,
    manufacturer: String,
    brand: String,
    location: {
      building: String,
      floor: String,
      room: String,
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    assignedTo: {
      department: String,
      employeeId: String,
      employeeName: String,
    },
    purchaseInfo: {
      purchaseDate: Date,
      purchaseCost: Number,
      vendor: String,
      invoiceNumber: String,
      warrantyExpiry: Date,
    },
    specifications: {
      type: Map,
      of: Schema.Types.Mixed,
    },
    metrics: {
      totalUptime: { type: Number, default: 0 },
      totalDowntime: { type: Number, default: 0 },
      mtbf: { type: Number, default: 0 },
      mttr: { type: Number, default: 0 },
      totalFailures: { type: Number, default: 0 },
      lastFailure: Date,
      lastMaintenance: Date,
    },
    iotEnabled: {
      type: Boolean,
      default: false,
    },
    iotDeviceId: String,
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
AssetSchema.index({ tenantId: 1, assetType: 1 });
AssetSchema.index({ tenantId: 1, status: 1 });
AssetSchema.index({ tenantId: 1, category: 1 });
AssetSchema.index({ tenantId: 1, 'assignedTo.department': 1 });
AssetSchema.index({ tenantId: 1, 'purchaseInfo.warrantyExpiry': 1 });

export const Asset = mongoose.model<IAsset>('Asset', AssetSchema);
