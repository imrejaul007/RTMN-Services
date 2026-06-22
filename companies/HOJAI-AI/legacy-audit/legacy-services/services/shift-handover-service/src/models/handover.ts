import mongoose, { Document, Schema, Model } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum HandoverStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  PENDING_ACKNOWLEDGMENT = 'pending_acknowledgment',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  CANCELLED = 'cancelled'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  DELEGATED = 'delegated',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AlertType {
  CRITICAL = 'critical',
  URGENT = 'urgent',
  WARNING = 'warning',
  INFO = 'info',
  ALLERGY = 'allergy',
  FALL_RISK = 'fall_risk',
  MEDICATION = 'medication',
  LAB_RESULT = 'lab_result'
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface IPatientHandover {
  patientId: string;
  patientName: string;
  roomNumber: string;
  bedNumber?: string;
  condition: string;
  diagnosis?: string;
  treatmentPlan?: string;
  pendingTasks: string[];
  concerns: string[];
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    oxygenSaturation?: number;
    respiratoryRate?: number;
  };
  lastUpdated: Date;
}

export interface ITaskHandover {
  taskId: string;
  description: string;
  category?: string;
  assignedTo?: string;
  assignedToName?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueTime?: Date;
  patientId?: string;
  notes?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface IAlertHandover {
  alertId: string;
  type: AlertType;
  patientId?: string;
  patientName?: string;
  description: string;
  actionRequired: string;
  actionTaken?: string;
  createdBy: string;
  createdAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface IHandoverAcknowledgment {
  userId: string;
  userName: string;
  role: string;
  acknowledgedAt: Date;
  comments?: string;
  signature?: string;
}

export interface IHandoverSection {
  patients: IPatientHandover[];
  tasks: ITaskHandover[];
  alerts: IAlertHandover[];
  notes: string;
  additionalInfo?: Record<string, unknown>;
}

export interface IShiftHandover extends Document {
  handoverId: string;
  outgoingShiftId: string;
  incomingShiftId: string;
  outgoingStaffId: string;
  outgoingStaffName: string;
  incomingStaffId?: string;
  incomingStaffName?: string;
  shiftDate: Date;
  shiftType: 'day' | 'night' | 'evening';
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  status: HandoverStatus;
  sections: IHandoverSection;
  acknowledgments: IHandoverAcknowledgment[];
  templateId?: string;
  templateName?: string;
  scheduledTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// SCHEMAS
// ============================================================================

const PatientHandoverSchema = new Schema<IPatientHandover>(
  {
    patientId: { type: String, required: true },
    patientName: { type: String, required: true },
    roomNumber: { type: String, required: true },
    bedNumber: { type: String },
    condition: { type: String, required: true },
    diagnosis: { type: String },
    treatmentPlan: { type: String },
    pendingTasks: [{ type: String }],
    concerns: [{ type: String }],
    vitals: {
      bloodPressure: { type: String },
      heartRate: { type: Number },
      temperature: { type: Number },
      oxygenSaturation: { type: Number },
      respiratoryRate: { type: Number }
    },
    lastUpdated: { type: Date, default: Date.now }
  },
  { _id: false }
);

const TaskHandoverSchema = new Schema<ITaskHandover>(
  {
    taskId: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String },
    assignedTo: { type: String },
    assignedToName: { type: String },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.PENDING
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM
    },
    dueTime: { type: Date },
    patientId: { type: String },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    completedAt: { type: Date }
  },
  { _id: false }
);

const AlertHandoverSchema = new Schema<IAlertHandover>(
  {
    alertId: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(AlertType),
      required: true
    },
    patientId: { type: String },
    patientName: { type: String },
    description: { type: String, required: true },
    actionRequired: { type: String, required: true },
    actionTaken: { type: String },
    createdBy: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date }
  },
  { _id: false }
);

const HandoverAcknowledgmentSchema = new Schema<IHandoverAcknowledgment>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    role: { type: String, required: true },
    acknowledgedAt: { type: Date, default: Date.now },
    comments: { type: String },
    signature: { type: String }
  },
  { _id: false }
);

const HandoverSectionSchema = new Schema<IHandoverSection>(
  {
    patients: [PatientHandoverSchema],
    tasks: [TaskHandoverSchema],
    alerts: [AlertHandoverSchema],
    notes: { type: String, default: '' },
    additionalInfo: { type: Schema.Types.Mixed }
  },
  { _id: false }
);

const ShiftHandoverSchema = new Schema<IShiftHandover>(
  {
    handoverId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    outgoingShiftId: {
      type: String,
      required: true,
      index: true
    },
    incomingShiftId: {
      type: String,
      index: true
    },
    outgoingStaffId: {
      type: String,
      required: true,
      index: true
    },
    outgoingStaffName: {
      type: String,
      required: true
    },
    incomingStaffId: {
      type: String,
      index: true
    },
    incomingStaffName: {
      type: String
    },
    shiftDate: {
      type: Date,
      required: true,
      index: true
    },
    shiftType: {
      type: String,
      enum: ['day', 'night', 'evening'],
      required: true
    },
    facilityId: {
      type: String,
      required: true,
      index: true
    },
    facilityName: {
      type: String,
      required: true
    },
    departmentId: {
      type: String,
      index: true
    },
    departmentName: {
      type: String
    },
    status: {
      type: String,
      enum: Object.values(HandoverStatus),
      default: HandoverStatus.DRAFT,
      index: true
    },
    sections: {
      type: HandoverSectionSchema,
      default: () => ({
        patients: [],
        tasks: [],
        alerts: [],
        notes: ''
      })
    },
    acknowledgments: [HandoverAcknowledgmentSchema],
    templateId: {
      type: String,
      index: true
    },
    templateName: {
      type: String
    },
    scheduledTime: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    },
    archivedAt: {
      type: Date
    },
    archivedBy: {
      type: String
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: true,
    collection: 'shift_handovers'
  }
);

// ============================================================================
// INDEXES
// ============================================================================

ShiftHandoverSchema.index({ facilityId: 1, shiftDate: 1 });
ShiftHandoverSchema.index({ facilityId: 1, departmentId: 1, shiftDate: 1 });
ShiftHandoverSchema.index({ incomingStaffId: 1, status: 1 });
ShiftHandoverSchema.index({ status: 1, shiftDate: 1 });
ShiftHandoverSchema.index({ 'sections.alerts.type': 1 });
ShiftHandoverSchema.index({ createdAt: -1 });

// Text index for search
ShiftHandoverSchema.index(
  {
    'sections.notes': 'text',
    'sections.patients.patientName': 'text',
    'sections.patients.condition': 'text',
    'sections.tasks.description': 'text',
    'sections.alerts.description': 'text'
  },
  {
    weights: {
      'sections.alerts.description': 10,
      'sections.patients.patientName': 5,
      'sections.tasks.description': 3,
      'sections.notes': 2,
      'sections.patients.condition': 1
    }
  }
);

// ============================================================================
// MODEL
// ============================================================================

export const ShiftHandover: Model<IShiftHandover> = mongoose.model<IShiftHandover>(
  'ShiftHandover',
  ShiftHandoverSchema
);

// ============================================================================
// TEMPLATE SCHEMA
// ============================================================================

export interface IHandoverTemplate extends Document {
  templateId: string;
  name: string;
  description?: string;
  facilityId: string;
  facilityName: string;
  departmentId?: string;
  departmentName?: string;
  sections: {
    includePatients: boolean;
    includeTasks: boolean;
    includeAlerts: boolean;
    includeNotes: boolean;
    patientFields: string[];
    taskCategories: string[];
    alertTypes: AlertType[];
  };
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const HandoverTemplateSchema = new Schema<IHandoverTemplate>(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String
    },
    facilityId: {
      type: String,
      required: true,
      index: true
    },
    facilityName: {
      type: String,
      required: true
    },
    departmentId: {
      type: String
    },
    departmentName: {
      type: String
    },
    sections: {
      includePatients: { type: Boolean, default: true },
      includeTasks: { type: Boolean, default: true },
      includeAlerts: { type: Boolean, default: true },
      includeNotes: { type: Boolean, default: true },
      patientFields: [{ type: String }],
      taskCategories: [{ type: String }],
      alertTypes: [{ type: String, enum: Object.values(AlertType) }]
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    createdBy: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: 'handover_templates'
  }
);

HandoverTemplateSchema.index({ facilityId: 1, isActive: 1 });
HandoverTemplateSchema.index({ departmentId: 1, isActive: 1 });

export const HandoverTemplate: Model<IHandoverTemplate> = mongoose.model<IHandoverTemplate>(
  'HandoverTemplate',
  HandoverTemplateSchema
);

// ============================================================================
// ARCHIVED HANDOVER SCHEMA
// ============================================================================

export interface IArchivedHandover extends Document {
  handoverId: string;
  originalHandoverId: string;
  archiveData: IShiftHandover;
  archivedAt: Date;
  archivedBy: string;
  reason?: string;
  shiftDuration?: number;
  taskCompletionRate?: number;
  alertCount?: number;
}

const ArchivedHandoverSchema = new Schema<IArchivedHandover>(
  {
    handoverId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    originalHandoverId: {
      type: String,
      required: true,
      index: true
    },
    archiveData: {
      type: Schema.Types.Mixed,
      required: true
    },
    archivedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    archivedBy: {
      type: String,
      required: true
    },
    reason: {
      type: String
    },
    shiftDuration: {
      type: Number
    },
    taskCompletionRate: {
      type: Number
    },
    alertCount: {
      type: Number
    }
  },
  {
    timestamps: false,
    collection: 'archived_handovers'
  }
);

ArchivedHandoverSchema.index({ archivedAt: -1 });
ArchivedHandoverSchema.index({ facilityId: 1, archivedAt: -1 });

export const ArchivedHandover: Model<IArchivedHandover> = mongoose.model<IArchivedHandover>(
  'ArchivedHandover',
  ArchivedHandoverSchema
);

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PatientHandoverSchema,
  TaskHandoverSchema,
  AlertHandoverSchema,
  HandoverAcknowledgmentSchema,
  HandoverSectionSchema,
  ShiftHandoverSchema
};
