import mongoose, { Document, Schema, Model } from 'mongoose';

// Warranty Types
export type WarrantyType = 'manufacturer' | 'extended';
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type RepairStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Coverage Schema
export interface IWarrantyCoverage {
  parts: boolean;
  labor: boolean;
  type: 'basic' | 'comprehensive' | 'limited';
  deductible?: number;
  maxCoverageAmount?: number;
}

// Claim Schema (embedded)
export interface IWarrantyClaim {
  claimId: string;
  date: Date;
  issue: string;
  description: string;
  status: ClaimStatus;
  resolution?: string;
  approvedAmount?: number;
  claimAmount: number;
  documents?: string[];
  approvedBy?: string;
  processedAt?: Date;
}

// Repair Schema (embedded)
export interface IWarrantyRepair {
  repairId: string;
  claimId?: string;
  date: Date;
  type: string;
  description: string;
  status: RepairStatus;
  technician?: string;
  cost?: number;
  completedAt?: Date;
  partsUsed?: {
    partName: string;
    partNumber: string;
    quantity: number;
    cost: number;
  }[];
}

// Service History (embedded)
export interface IServiceHistoryEntry {
  date: Date;
  type: 'purchase' | 'claim' | 'repair' | 'inspection' | 'renewal';
  description: string;
  performedBy?: string;
  referenceId?: string;
}

// Main Warranty Interface
export interface IWarranty extends Document {
  warrantyId: string;
  tenantId: string;
  customerId: string;
  productId: string;
  orderId?: string;
  productName: string;
  productModel?: string;
  productSerial?: string;
  manufacturer?: string;
  type: WarrantyType;
  startDate: Date;
  endDate: Date;
  purchaseDate: Date;
  isValid: boolean;
  isActive: boolean;
  coverage: IWarrantyCoverage;
  claims: IWarrantyClaim[];
  repairs: IWarrantyRepair[];
  serviceHistory: IServiceHistoryEntry[];
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Warranty Schema
const WarrantySchema = new Schema<IWarranty>(
  {
    warrantyId: {
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
    customerId: {
      type: String,
      required: true,
      index: true
    },
    productId: {
      type: String,
      required: true,
      index: true
    },
    orderId: {
      type: String,
      index: true
    },
    productName: {
      type: String,
      required: true
    },
    productModel: String,
    productSerial: String,
    manufacturer: String,
    type: {
      type: String,
      enum: ['manufacturer', 'extended'],
      required: true,
      default: 'manufacturer'
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true,
      index: true
    },
    purchaseDate: {
      type: Date,
      required: true
    },
    isValid: {
      type: Boolean,
      default: true,
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    coverage: {
      parts: { type: Boolean, default: true },
      labor: { type: Boolean, default: true },
      type: {
        type: String,
        enum: ['basic', 'comprehensive', 'limited'],
        default: 'basic'
      },
      deductible: Number,
      maxCoverageAmount: Number
    },
    claims: [{
      claimId: { type: String, required: true },
      date: { type: Date, required: true },
      issue: { type: String, required: true },
      description: String,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed'],
        default: 'pending'
      },
      resolution: String,
      approvedAmount: Number,
      claimAmount: { type: Number, required: true },
      documents: [String],
      approvedBy: String,
      processedAt: Date
    }],
    repairs: [{
      repairId: { type: String, required: true },
      claimId: String,
      date: { type: Date, required: true },
      type: { type: String, required: true },
      description: String,
      status: {
        type: String,
        enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'scheduled'
      },
      technician: String,
      cost: Number,
      completedAt: Date,
      partsUsed: [{
        partName: String,
        partNumber: String,
        quantity: Number,
        cost: Number
      }]
    }],
    serviceHistory: [{
      date: { type: Date, required: true },
      type: {
        type: String,
        enum: ['purchase', 'claim', 'repair', 'inspection', 'renewal'],
        required: true
      },
      description: { type: String, required: true },
      performedBy: String,
      referenceId: String
    }],
    notes: String,
    metadata: Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'warranties'
  }
);

// Indexes for efficient queries
WarrantySchema.index({ tenantId: 1, customerId: 1 });
WarrantySchema.index({ tenantId: 1, productId: 1 });
WarrantySchema.index({ tenantId: 1, endDate: 1 });
WarrantySchema.index({ tenantId: 1, 'claims.claimId': 1 });
WarrantySchema.index({ tenantId: 1, isValid: 1, endDate: 1 });

// Virtual for days remaining
WarrantySchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

// Virtual for is expired
WarrantySchema.virtual('isExpired').get(function() {
  return new Date() > new Date(this.endDate);
});

// Method to check if warranty covers a specific issue type
WarrantySchema.methods.coversIssue = function(issueType: 'parts' | 'labor'): boolean {
  return this.isValid && this.isActive && this.coverage[issueType];
};

// Method to add a claim
WarrantySchema.methods.addClaim = function(claim: IWarrantyClaim): void {
  this.claims.push(claim);
  this.serviceHistory.push({
    date: new Date(),
    type: 'claim',
    description: `Claim ${claim.claimId}: ${claim.issue}`,
    referenceId: claim.claimId
  });
};

// Method to add a repair
WarrantySchema.methods.addRepair = function(repair: IWarrantyRepair): void {
  this.repairs.push(repair);
  this.serviceHistory.push({
    date: new Date(),
    type: 'repair',
    description: `Repair ${repair.repairId}: ${repair.type}`,
    referenceId: repair.repairId
  });
};

// Pre-save middleware to validate warranty dates
WarrantySchema.pre('save', function(next) {
  if (new Date(this.startDate) > new Date(this.endDate)) {
    next(new Error('Start date cannot be after end date'));
  }
  if (new Date(this.endDate) < new Date()) {
    this.isValid = false;
  }
  next();
});

// Export model
export const Warranty: Model<IWarranty> = mongoose.model<IWarranty>('Warranty', WarrantySchema);
