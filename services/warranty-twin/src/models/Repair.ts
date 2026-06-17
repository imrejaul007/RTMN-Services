import mongoose, { Document, Schema, Model } from 'mongoose';

// Repair Status
export type RepairStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

// Part Used Schema
export interface IPartUsed {
  partId?: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  isWarrantyCovered: boolean;
}

// Labor Entry Schema
export interface ILaborEntry {
  technicianId: string;
  technicianName: string;
  startTime: Date;
  endTime?: Date;
  hoursWorked?: number;
  hourlyRate?: number;
  laborCost?: number;
  notes?: string;
}

// Repair Image/Attachment Schema
export interface IRepairAttachment {
  attachmentId: string;
  type: 'image' | 'document' | 'video';
  url: string;
  description?: string;
  uploadedAt: Date;
}

// Diagnosis Schema
export interface IDiagnosis {
  diagnosedAt: Date;
  diagnosedBy: string;
  symptoms: string[];
  rootCause: string;
  recommendedAction: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Main Repair Interface
export interface IRepair extends Document {
  repairId: string;
  warrantyId?: string;
  claimId?: string;
  tenantId: string;
  customerId: string;
  productId: string;
  productSerial?: string;
  date: Date;
  type: string;
  category: 'hardware' | 'software' | 'maintenance' | 'inspection';
  description: string;
  status: RepairStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  diagnosis?: IDiagnosis;
  partsUsed: IPartUsed[];
  laborEntries: ILaborEntry[];
  totalPartsCost: number;
  totalLaborCost: number;
  totalCost: number;
  isWarrantyCovered: boolean;
  warrantyCoverageAmount?: number;
  customerPaidAmount?: number;
  technician?: string;
  technicianNotes?: string;
  scheduledDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionDate?: Date;
  attachments: IRepairAttachment[];
  customerFeedback?: {
    rating: number;
    comment?: string;
    submittedAt?: Date;
  };
  nextServiceDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Repair Schema
const RepairSchema = new Schema<IRepair>(
  {
    repairId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    warrantyId: String,
    claimId: String,
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
    productSerial: String,
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    type: {
      type: String,
      required: true
    },
    category: {
      type: String,
      enum: ['hardware', 'software', 'maintenance', 'inspection'],
      default: 'hardware'
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    diagnosis: {
      diagnosedAt: Date,
      diagnosedBy: String,
      symptoms: [String],
      rootCause: String,
      recommendedAction: String,
      severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    },
    partsUsed: [{
      partId: String,
      partName: { type: String, required: true },
      partNumber: { type: String, required: true },
      quantity: { type: Number, default: 1 },
      unitCost: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      isWarrantyCovered: { type: Boolean, default: true }
    }],
    laborEntries: [{
      technicianId: { type: String, required: true },
      technicianName: { type: String, required: true },
      startTime: { type: Date, required: true },
      endTime: Date,
      hoursWorked: Number,
      hourlyRate: Number,
      laborCost: Number,
      notes: String
    }],
    totalPartsCost: {
      type: Number,
      default: 0
    },
    totalLaborCost: {
      type: Number,
      default: 0
    },
    totalCost: {
      type: Number,
      default: 0,
      index: true
    },
    isWarrantyCovered: {
      type: Boolean,
      default: true
    },
    warrantyCoverageAmount: Number,
    customerPaidAmount: Number,
    technician: String,
    technicianNotes: String,
    scheduledDate: Date,
    startedAt: Date,
    completedAt: Date,
    estimatedCompletionDate: Date,
    attachments: [{
      attachmentId: { type: String, required: true },
      type: {
        type: String,
        enum: ['image', 'document', 'video'],
        required: true
      },
      url: { type: String, required: true },
      description: String,
      uploadedAt: { type: Date, default: Date.now }
    }],
    customerFeedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      submittedAt: Date
    },
    nextServiceDate: Date,
    metadata: Schema.Types.Mixed
  },
  {
    timestamps: true,
    collection: 'repairs'
  }
);

// Compound indexes for common queries
RepairSchema.index({ tenantId: 1, status: 1 });
RepairSchema.index({ tenantId: 1, customerId: 1 });
RepairSchema.index({ tenantId: 1, warrantyId: 1 });
RepairSchema.index({ tenantId: 1, date: -1 });
RepairSchema.index({ tenantId: 1, technician: 1 });
RepairSchema.index({ tenantId: 1, scheduledDate: 1 });
RepairSchema.index({ warrantyId: 1, claimId: 1 });

// Virtual for repair duration
RepairSchema.virtual('duration').get(function() {
  if (!this.startedAt || !this.completedAt) return null;
  return new Date(this.completedAt).getTime() - new Date(this.startedAt).getTime();
});

// Method to start repair
RepairSchema.methods.start = function() {
  this.status = 'in_progress';
  this.startedAt = new Date();
};

// Method to complete repair
RepairSchema.methods.complete = function(technicianNotes?: string) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (technicianNotes) {
    this.technicianNotes = technicianNotes;
  }
  this.calculateTotals();
};

// Method to cancel repair
RepairSchema.methods.cancel = function(reason: string) {
  this.status = 'cancelled';
  this.technicianNotes = (this.technicianNotes || '') + `\nCancelled: ${reason}`;
};

// Method to add part
RepairSchema.methods.addPart = function(part: IPartUsed) {
  part.totalCost = part.quantity * part.unitCost;
  this.partsUsed.push(part);
  this.calculateTotals();
};

// Method to add labor entry
RepairSchema.methods.addLabor = function(labor: ILaborEntry) {
  if (labor.endTime && labor.startTime) {
    const hours = (new Date(labor.endTime).getTime() - new Date(labor.startTime).getTime()) / (1000 * 60 * 60);
    labor.hoursWorked = hours;
    if (labor.hourlyRate) {
      labor.laborCost = hours * labor.hourlyRate;
    }
  }
  this.laborEntries.push(labor);
  this.calculateTotals();
};

// Method to calculate totals
RepairSchema.methods.calculateTotals = function() {
  this.totalPartsCost = this.partsUsed.reduce((sum, part) => sum + part.totalCost, 0);
  this.totalLaborCost = this.laborEntries.reduce((sum, labor) => sum + (labor.laborCost || 0), 0);
  this.totalCost = this.totalPartsCost + this.totalLaborCost;

  if (this.isWarrantyCovered && this.warrantyCoverageAmount !== undefined) {
    this.customerPaidAmount = Math.max(0, this.totalCost - this.warrantyCoverageAmount);
  }
};

// Pre-save middleware to calculate totals
RepairSchema.pre('save', function(next) {
  this.calculateTotals();
  next();
});

// Export model
export const Repair: Model<IRepair> = mongoose.model<IRepair>('Repair', RepairSchema);
