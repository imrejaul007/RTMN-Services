import mongoose, { Document, Schema } from 'mongoose';

// Claim Status
export type ClaimStatus =
  | 'draft'           // Created but not submitted
  | 'submitted'       // Submitted for review
  | 'under_review'    // Being reviewed
  | 'approved'        // Approved for payment/repair
  | 'rejected'        // Rejected
  | 'in_progress'     // Work in progress
  | 'completed'       // Claim fulfilled
  | 'closed'          // Claim closed
  | 'cancelled';      // Cancelled by user

// Claim Type
export type ClaimType =
  | 'warranty'        // Warranty claim
  | 'amc'             // AMC service claim
  | 'insurance'       // Insurance claim
  | 'damage'          // Damage claim
  | 'defect'          // Manufacturing defect
  | 'malfunction';    // Equipment malfunction

// Priority
export type ClaimPriority = 'low' | 'medium' | 'high' | 'urgent';

// Interface for Claim Document
export interface IClaim extends Document {
  // Multi-tenant support
  tenantId: string;

  // Reference to Asset
  assetId: string;

  // Claim Details
  claimId: string;
  claimType: ClaimType;
  status: ClaimPriority;
  priority: ClaimPriority;

  // Title and Description
  title: string;
  description: string;

  // Claim Period
  incidentDate: Date;
  reportedDate: Date;
  claimPeriod?: {
    from: Date;
    to: Date;
  };

  // Issue Details
  issue?: {
    category: string;
    subcategory?: string;
    symptoms: string[];
    severity: 'minor' | 'moderate' | 'major' | 'critical';
    affectedParts?: string[];
  };

  // Diagnosis
  diagnosis?: {
    diagnosedBy?: string;
    diagnosedDate?: Date;
    diagnosis: string;
    notes?: string;
  };

  // Resolution
  resolution?: {
    resolutionType?: 'repair' | 'replacement' | 'refund' | 'credit' | 'other';
    resolutionDetails?: string;
    resolvedBy?: string;
    resolvedDate?: Date;
    sparePartsUsed?: Array<{
      partName: string;
      partNumber?: string;
      quantity: number;
      cost?: number;
    }>;
  };

  // Costs
  costs?: {
    estimatedCost?: number;
    approvedCost?: number;
    actualCost?: number;
    currency: string;
  };

  // Warranty/AMC Reference
  warrantyId?: string;
  amcId?: string;

  // Provider/Vendor
  provider?: {
    name: string;
    contactPerson?: string;
    contactNumber?: string;
    email?: string;
    claimNumber?: string;
  };

  // Timeline/History
  history?: Array<{
    action: string;
    performedBy?: string;
    performedAt: Date;
    notes?: string;
  }>;

  // Documents/Evidence
  documents?: Array<{
    name: string;
    url: string;
    type: string;
    category?: 'invoice' | 'photo' | 'report' | 'certificate' | 'other';
    uploadedAt: Date;
  }>;

  // Notifications
  notifications?: {
    customerNotified: boolean;
    lastNotificationDate?: Date;
    notifyEmails?: string[];
  };

  // Feedback
  feedback?: {
    rating?: number;
    comments?: string;
    submittedAt?: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Claim Schema
const ClaimSchema = new Schema<IClaim>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    assetId: {
      type: String,
      required: true,
      index: true,
    },
    claimId: {
      type: String,
      required: true,
      unique: true,
    },
    claimType: {
      type: String,
      enum: ['warranty', 'amc', 'insurance', 'damage', 'defect', 'malfunction'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'in_progress', 'completed', 'closed', 'cancelled'],
      default: 'draft',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    incidentDate: {
      type: Date,
      required: true,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },
    claimPeriod: {
      from: Date,
      to: Date,
    },
    issue: {
      category: String,
      subcategory: String,
      symptoms: [String],
      severity: {
        type: String,
        enum: ['minor', 'moderate', 'major', 'critical'],
      },
      affectedParts: [String],
    },
    diagnosis: {
      diagnosedBy: String,
      diagnosedDate: Date,
      diagnosis: String,
      notes: String,
    },
    resolution: {
      resolutionType: {
        type: String,
        enum: ['repair', 'replacement', 'refund', 'credit', 'other'],
      },
      resolutionDetails: String,
      resolvedBy: String,
      resolvedDate: Date,
      sparePartsUsed: [
        {
          partName: String,
          partNumber: String,
          quantity: Number,
          cost: Number,
        },
      ],
    },
    costs: {
      estimatedCost: Number,
      approvedCost: Number,
      actualCost: Number,
      currency: { type: String, default: 'USD' },
    },
    warrantyId: String,
    amcId: String,
    provider: {
      name: String,
      contactPerson: String,
      contactNumber: String,
      email: String,
      claimNumber: String,
    },
    history: [
      {
        action: String,
        performedBy: String,
        performedAt: { type: Date, default: Date.now },
        notes: String,
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        type: String,
        category: {
          type: String,
          enum: ['invoice', 'photo', 'report', 'certificate', 'other'],
        },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notifications: {
      customerNotified: { type: Boolean, default: false },
      lastNotificationDate: Date,
      notifyEmails: [String],
    },
    feedback: {
      rating: Number,
      comments: String,
      submittedAt: Date,
    },
    createdBy: String,
  },
  {
    timestamps: true,
  }
);

// Indexes
ClaimSchema.index({ tenantId: 1, assetId: 1 });
ClaimSchema.index({ tenantId: 1, status: 1 });
ClaimSchema.index({ tenantId: 1, claimType: 1 });
ClaimSchema.index({ tenantId: 1, warrantyId: 1 });
ClaimSchema.index({ tenantId: 1, amcId: 1 });
ClaimSchema.index({ tenantId: 1, reportedDate: 1 });

// Virtual to get claim age in days
ClaimSchema.virtual('ageInDays').get(function () {
  const now = new Date();
  const diff = now.getTime() - this.reportedDate.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);
