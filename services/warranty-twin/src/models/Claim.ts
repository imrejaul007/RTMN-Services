import mongoose, { Document, Schema, Model } from 'mongoose';

// Claim Status and Priority
export type ClaimStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed';
export type ClaimPriority = 'low' | 'medium' | 'high' | 'urgent';

// Claim Item Schema (for multiple items in one claim)
export interface IClaimItem {
  itemName: string;
  itemDescription: string;
  quantity: number;
  claimedAmount: number;
  approvedAmount?: number;
  isApproved?: boolean;
}

// Claim Note Schema
export interface IClaimNote {
  noteId: string;
  content: string;
  addedBy: string;
  addedAt: Date;
  isInternal: boolean;
}

// Main Claim Interface (standalone collection for complex queries)
export interface IClaim extends Document {
  claimId: string;
  warrantyId: string;
  tenantId: string;
  customerId: string;
  productId: string;
  date: Date;
  issue: string;
  description: string;
  priority: ClaimPriority;
  status: ClaimStatus;
  items: IClaimItem[];
  claimAmount: number;
  approvedAmount: number;
  deductibleApplied: number;
  resolution?: string;
  documents: string[];
  notes: IClaimNote[];
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  scheduledDate?: Date;
  completedAt?: Date;
  processedAt?: Date;
  estimatedCompletionDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Claim Schema
const ClaimSchema = new Schema<IClaim>(
  {
    claimId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    warrantyId: {
      type: String,
      required: true,
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
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    issue: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed'],
      default: 'pending',
      index: true
    },
    items: [{
      itemName: { type: String, required: true },
      itemDescription: String,
      quantity: { type: Number, default: 1 },
      claimedAmount: { type: Number, required: true },
      approvedAmount: Number,
      isApproved: { type: Boolean, default: false }
    }],
    claimAmount: {
      type: Number,
      required: true,
      index: true
    },
    approvedAmount: {
      type: Number,
      default: 0
    },
    deductibleApplied: {
      type: Number,
      default: 0
    },
    resolution: String,
    documents: [{
      type: String
    }],
    notes: [{
      noteId: { type: String, required: true },
      content: { type: String, required: true },
      addedBy: { type: String, required: true },
      addedAt: { type: Date, default: Date.now },
      isInternal: { type: Boolean, default: false }
    }],
    approvedBy: String,
    rejectedBy: String,
    rejectionReason: String,
    scheduledDate: Date,
    completedAt: Date,
    processedAt: Date,
    estimatedCompletionDate: Date,
    metadata: Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'claims'
  }
);

// Compound indexes for common queries
ClaimSchema.index({ tenantId: 1, status: 1 });
ClaimSchema.index({ tenantId: 1, customerId: 1 });
ClaimSchema.index({ tenantId: 1, warrantyId: 1 });
ClaimSchema.index({ tenantId: 1, date: -1 });
ClaimSchema.index({ tenantId: 1, priority: 1, status: 1 });

// Virtual for processing time
ClaimSchema.virtual('processingTime').get(function() {
  if (!this.processedAt) return null;
  return new Date(this.processedAt).getTime() - new Date(this.date).getTime();
});

// Method to approve claim
ClaimSchema.methods.approve = function(approvedBy: string, approvedAmount?: number) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAmount = approvedAmount ?? this.claimAmount;
  this.processedAt = new Date();

  // Update item approval status
  this.items.forEach(item => {
    if (!item.isApproved && item.claimedAmount <= this.approvedAmount) {
      item.isApproved = true;
      item.approvedAmount = item.claimedAmount;
    }
  });
};

// Method to reject claim
ClaimSchema.methods.reject = function(rejectedBy: string, reason: string) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectionReason = reason;
  this.processedAt = new Date();
};

// Method to add note
ClaimSchema.methods.addNote = function(noteId: string, content: string, addedBy: string, isInternal = false) {
  this.notes.push({
    noteId,
    content,
    addedBy,
    addedAt: new Date(),
    isInternal
  });
};

// Method to mark as in progress
ClaimSchema.methods.startProcessing = function() {
  this.status = 'in_progress';
};

// Method to complete claim
ClaimSchema.methods.complete = function(resolution: string) {
  this.status = 'completed';
  this.resolution = resolution;
  this.completedAt = new Date();
};

// Pre-save middleware
ClaimSchema.pre('save', function(next) {
  // Calculate total claimed amount from items
  if (this.items && this.items.length > 0) {
    const calculatedAmount = this.items.reduce((sum, item) => sum + (item.claimedAmount * item.quantity), 0);
    if (calculatedAmount !== this.claimAmount) {
      this.claimAmount = calculatedAmount;
    }
  }
  next();
});

// Export model
export const Claim: Model<IClaim> = mongoose.model<IClaim>('Claim', ClaimSchema);
