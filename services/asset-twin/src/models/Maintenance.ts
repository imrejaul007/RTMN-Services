import mongoose, { Document, Schema } from 'mongoose';

// Maintenance Types
export type MaintenanceType =
  | 'preventive'      // Scheduled preventive maintenance
  | 'corrective'      // Fixing a failure
  | 'predictive'      // Based on condition monitoring
  | 'inspective'      // Inspection/audit
  | 'emergency'       // Urgent repairs
  | 'calibration'     // Calibration
  | 'software_update' // Software/firmware update
  | 'cleaning'        // Cleaning
  | 'parts_replacement'; // Parts replacement

// Maintenance Status
export type MaintenanceStatus =
  | 'scheduled'       // Planned
  | 'in_progress'     // Currently being worked on
  | 'on_hold'         // Paused
  | 'completed'       // Finished successfully
  | 'cancelled'       // Cancelled
  | 'pending_parts';  // Waiting for parts

// Priority
export type MaintenancePriority = 'low' | 'medium' | 'high' | 'critical';

// Interface for Maintenance Document
export interface IMaintenance extends Document {
  // Multi-tenant support
  tenantId: string;

  // Reference to Asset
  assetId: string;

  // Maintenance Details
  maintenanceId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  priority: MaintenancePriority;

  // Schedule
  scheduledDate?: Date;
  startDate?: Date;
  completedDate?: Date;

  // Description
  title: string;
  description?: string;
  symptoms?: string[];
  rootCause?: string;

  // Work Details
  workDetails?: {
    workPerformed: string[];
    partsUsed?: Array<{
      partName: string;
      partNumber?: string;
      quantity: number;
      cost?: number;
    }>;
    laborHours?: number;
    laborCost?: number;
  };

  // Personnel
  performedBy?: {
    technicianId?: string;
    technicianName?: string;
    department?: string;
    vendorName?: string;
    vendorContact?: string;
  };

  // Costs
  costs?: {
    partsCost: number;
    laborCost: number;
    otherCosts: number;
    totalCost: number;
    currency: string;
  };

  // Downtime
  downtime?: {
    startTime?: Date;
    endTime?: Date;
    durationHours?: number;
    assetDown?: boolean;
  };

  // Quality
  quality?: {
    checklist?: Array<{
      item: string;
      completed: boolean;
      notes?: string;
    }>;
    notes?: string;
    technicianSignature?: string;
    supervisorApproval?: string;
  };

  // Related Documents
  documents?: Array<{
    name: string;
    url: string;
    type: string;
    uploadedAt: Date;
  }>;

  // Previous Maintenance (for tracking)
  previousMaintenanceId?: string;

  // Next Scheduled Maintenance
  nextScheduledMaintenance?: Date;

  // Alerts
  alerts?: {
    notifyBefore: boolean;
    notifyTechnician?: string;
    notifyEmail?: string;
  };

  // Warranty Claim Reference
  claimId?: string;

  // Feedback
  feedback?: {
    rating?: number;  // 1-5
    comments?: string;
    submittedAt?: Date;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// Maintenance Schema
const MaintenanceSchema = new Schema<IMaintenance>(
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
    maintenanceId: {
      type: String,
      required: true,
      unique: true,
    },
    maintenanceType: {
      type: String,
      enum: [
        'preventive',
        'corrective',
        'predictive',
        'inspective',
        'emergency',
        'calibration',
        'software_update',
        'cleaning',
        'parts_replacement',
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled', 'pending_parts'],
      default: 'scheduled',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    scheduledDate: Date,
    startDate: Date,
    completedDate: Date,
    title: {
      type: String,
      required: true,
    },
    description: String,
    symptoms: [String],
    rootCause: String,
    workDetails: {
      workPerformed: [String],
      partsUsed: [
        {
          partName: String,
          partNumber: String,
          quantity: Number,
          cost: Number,
        },
      ],
      laborHours: Number,
      laborCost: Number,
    },
    performedBy: {
      technicianId: String,
      technicianName: String,
      department: String,
      vendorName: String,
      vendorContact: String,
    },
    costs: {
      partsCost: { type: Number, default: 0 },
      laborCost: { type: Number, default: 0 },
      otherCosts: { type: Number, default: 0 },
      totalCost: { type: Number, default: 0 },
      currency: { type: String, default: 'USD' },
    },
    downtime: {
      startTime: Date,
      endTime: Date,
      durationHours: Number,
      assetDown: { type: Boolean, default: false },
    },
    quality: {
      checklist: [
        {
          item: String,
          completed: { type: Boolean, default: false },
          notes: String,
        },
      ],
      notes: String,
      technicianSignature: String,
      supervisorApproval: String,
    },
    documents: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    previousMaintenanceId: String,
    nextScheduledMaintenance: Date,
    alerts: {
      notifyBefore: { type: Boolean, default: true },
      notifyTechnician: String,
      notifyEmail: String,
    },
    claimId: String,
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
MaintenanceSchema.index({ tenantId: 1, assetId: 1 });
MaintenanceSchema.index({ tenantId: 1, status: 1 });
MaintenanceSchema.index({ tenantId: 1, maintenanceType: 1 });
MaintenanceSchema.index({ tenantId: 1, scheduledDate: 1 });
MaintenanceSchema.index({ tenantId: 1, completedDate: 1 });

// Virtual to calculate total downtime duration
MaintenanceSchema.virtual('totalDowntimeHours').get(function () {
  if (this.downtime?.startTime && this.downtime?.endTime) {
    const diff = this.downtime.endTime.getTime() - this.downtime.startTime.getTime();
    return diff / (1000 * 60 * 60); // Convert to hours
  }
  return this.downtime?.durationHours || 0;
});

export const Maintenance = mongoose.model<IMaintenance>('Maintenance', MaintenanceSchema);
