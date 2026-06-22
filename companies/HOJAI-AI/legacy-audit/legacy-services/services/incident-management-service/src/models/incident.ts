import mongoose, { Document, Schema } from 'mongoose';

// ============================================================================
// ENUMS
// ============================================================================

export enum IncidentType {
  FALL = 'fall',
  MEDICATION_ERROR = 'medication_error',
  SAFEGUARDING = 'safeguarding',
  ELOPEMENT = 'elopement',
  AGGRESSION = 'aggression',
  WOUND = 'wound',
  EQUIPMENT = 'equipment',
  OTHER = 'other'
}

export enum IncidentSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CRITICAL = 'critical'
}

export enum IncidentStatus {
  REPORTED = 'reported',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CLOSED = 'closed'
}

export enum InjuryType {
  BRUISE = 'bruise',
  LACERATION = 'laceration',
  FRACTURE = 'fracture',
  SPRAIN = 'sprain',
  BURN = 'burn',
  CONTUSION = 'contusion',
  ABRASION = 'abrasion',
  HEAD_INJURY = 'head_injury',
  NONE = 'none',
  OTHER = 'other'
}

export enum BodyPart {
  HEAD = 'head',
  NECK = 'neck',
  CHEST = 'chest',
  ABDOMEN = 'abdomen',
  BACK = 'back',
  LEFT_ARM = 'left_arm',
  RIGHT_ARM = 'right_arm',
  LEFT_LEG = 'left_leg',
  RIGHT_LEG = 'right_leg',
  HAND = 'hand',
  FOOT = 'foot',
  MULTIPLE = 'multiple',
  OTHER = 'other'
}

export enum ConcernType {
  PHYSICAL_ABUSE = 'physical_abuse',
  EMOTIONAL_ABUSE = 'emotional_abuse',
  SEXUAL_ABUSE = 'sexual_abuse',
  NEGLECT = 'neglect',
  FINANCIAL_ABUSE = 'financial_abuse',
  SELF_NEGLECT = 'self_neglect',
  EXPLOITATION = 'exploitation',
  RADICALISATION = 'radicalisation',
  MISSING_PERSON = 'missing_person',
  OTHER = 'other'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  IMMEDIATE = 'immediate'
}

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

export interface IIncidentInjury {
  type: InjuryType;
  bodyPart: BodyPart;
  severity: IncidentSeverity;
  description?: string;
  treatmentRequired: boolean;
  treatmentGiven?: string;
  medicalAttentionRequired: boolean;
}

export interface IIncidentWitness {
  witnessId: string;
  witnessName: string;
  witnessRole: string;
  statement: string;
  timeOfObservation: Date;
  contactNumber?: string;
  isPrimaryWitness: boolean;
  attachments?: string[];
}

export interface IIncidentInvestigation {
  investigatorId: string;
  investigatorName: string;
  investigatorRole: string;
  startDate: Date;
  endDate?: Date;
  findings: string;
  rootCause?: string;
  contributingFactors?: string[];
  recommendations: string[];
  correctiveActions: Array<{
    action: string;
    assignedTo: string;
    dueDate: Date;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
  status: 'in_progress' | 'completed';
}

export interface ISafeguardingConcern {
  concernId: string;
  concernType: ConcernType;
  description: string;
  riskLevel: RiskLevel;
  vulnerablePersonId: string;
  vulnerablePersonName: string;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  immediateActionsTaken: string[];
  authoritiesNotified: boolean;
  authoritiesContacted?: Array<{
    authority: string;
    contactDate: Date;
    contactPerson?: string;
    outcome?: string;
  }>;
  protectionPlan?: {
    planId: string;
    measures: string[];
    responsibleParties: string[];
    startDate: Date;
    reviewDate: Date;
    status: 'draft' | 'active' | 'reviewed' | 'closed';
  };
  followUpActions: Array<{
    action: string;
    assignedTo: string;
    dueDate: Date;
    completed: boolean;
    completedDate?: Date;
  }>;
  status: 'raised' | 'assessing' | 'under_investigation' | 'resolved' | 'closed';
  resolution?: string;
  resolutionDate?: Date;
}

// ============================================================================
// MAIN INCIDENT SCHEMA
// ============================================================================

export interface IIncident extends Document {
  // Basic Information
  incidentId: string;
  patientId: string;
  patientName: string;
  facilityId: string;
  facilityName: string;

  // Incident Details
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;

  // Description & Location
  title: string;
  description: string;
  location: {
    building?: string;
    floor?: string;
    room?: string;
    area: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };

  // Timing
  incidentDate: Date;
  incidentTime: string;
  reportedDate: Date;
  lastModified: Date;

  // People Involved
  reportedBy: {
    userId: string;
    name: string;
    role: string;
    department?: string;
  };

  // Injuries
  injuries: IIncidentInjury[];

  // Witnesses
  witnesses: IIncidentWitness[];

  // Investigation
  investigation?: IIncidentInvestigation;

  // Resolution
  resolution?: {
    resolvedBy: string;
    resolvedByName: string;
    resolutionDate: Date;
    resolutionSummary: string;
    followUpRequired: boolean;
    followUpDate?: Date;
  };

  // Escalation
  escalation?: {
    escalatedBy: string;
    escalatedByName: string;
    escalationDate: Date;
    escalatedTo: string;
    escalationReason: string;
    previousSeverity?: IncidentSeverity;
  };

  // Safeguarding Link
  safeguardingConcernId?: string;

  // Medical Details
  medicalReview?: {
    reviewedBy?: string;
    reviewDate?: Date;
    medicalClearanceRequired: boolean;
    clearanceGiven?: boolean;
    clearanceDate?: Date;
    notes?: string;
  };

  // Documentation
  attachments: string[];
  notes: string[];

  // Compliance
  regulatoryReportable: boolean;
  regulatoryReportNumber?: string;
  policeNotified: boolean;
  familyNotified: boolean;

  // Metadata
  tags: string[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// SAFEGUARDING CONCERN SCHEMA (Separate Collection for Tracking)
// ============================================================================

export interface ISafeguarding extends Document {
  concernId: string;
  concernType: ConcernType;
  description: string;
  riskLevel: RiskLevel;
  previousRiskLevel?: RiskLevel;

  vulnerablePerson: {
    personId: string;
    name: string;
    dateOfBirth?: Date;
    gender?: string;
    careType?: string;
    careLocation?: string;
  };

  concernRaisedBy: {
    userId: string;
    name: string;
    role: string;
    department?: string;
    contactNumber?: string;
  };

  incidentLinked?: string;

  immediateActions: Array<{
    action: string;
    takenBy: string;
    takenAt: Date;
    effectiveness?: string;
  }>;

  riskAssessment: {
    assessedBy?: string;
    assessmentDate?: Date;
    riskScore: number;
    riskFactors: string[];
    protectiveFactors: string[];
    riskLevelJustification: string;
  };

  authorities: Array<{
    authorityName: string;
    contactDate: Date;
    contactPerson?: string;
    contactMethod?: string;
    referenceNumber?: string;
    outcome?: string;
    followUpRequired: boolean;
  }>;

  protectionPlan?: {
    planId: string;
    createdDate: Date;
    createdBy: string;
    measures: Array<{
      measure: string;
      responsibleParty: string;
      startDate: Date;
      endDate?: Date;
      status: 'planned' | 'active' | 'completed' | 'cancelled';
    }>;
    reviewDate: Date;
    nextReviewDate: Date;
    status: 'draft' | 'active' | 'under_review' | 'closed';
    notes?: string;
  };

  outcomes: Array<{
    outcome: string;
    achievedDate?: Date;
    achievedBy?: string;
    notes?: string;
  }>;

  status: 'raised' | 'assessing' | 'investigating' | 'plan_in_place' | 'resolved' | 'closed';
  statusHistory: Array<{
    status: string;
    changedBy: string;
    changedAt: Date;
    notes?: string;
  }>;

  relatedConcerns: string[];
  attachments: string[];
  followUpSchedule: Array<{
    scheduledDate: Date;
    purpose: string;
    completed: boolean;
    completedDate?: Date;
    completedBy?: string;
  }>;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MONGOOSE SCHEMAS
// ============================================================================

const IncidentInjurySchema = new Schema<IIncidentInjury>(
  {
    type: {
      type: String,
      enum: Object.values(InjuryType),
      required: true
    },
    bodyPart: {
      type: String,
      enum: Object.values(BodyPart),
      required: true
    },
    severity: {
      type: String,
      enum: Object.values(IncidentSeverity),
      required: true
    },
    description: { type: String },
    treatmentRequired: { type: Boolean, default: false },
    treatmentGiven: { type: String },
    medicalAttentionRequired: { type: Boolean, default: false }
  },
  { _id: false }
);

const IncidentWitnessSchema = new Schema<IIncidentWitness>(
  {
    witnessId: { type: String, required: true },
    witnessName: { type: String, required: true },
    witnessRole: { type: String, required: true },
    statement: { type: String, required: true },
    timeOfObservation: { type: Date, required: true },
    contactNumber: { type: String },
    isPrimaryWitness: { type: Boolean, default: false },
    attachments: [{ type: String }]
  },
  { _id: false }
);

const CorrectiveActionSchema = new Schema(
  {
    action: { type: String, required: true },
    assignedTo: { type: String, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending'
    }
  },
  { _id: false }
);

const IncidentInvestigationSchema = new Schema<IIncidentInvestigation>(
  {
    investigatorId: { type: String, required: true },
    investigatorName: { type: String, required: true },
    investigatorRole: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    findings: { type: String, required: true },
    rootCause: { type: String },
    contributingFactors: [{ type: String }],
    recommendations: [{ type: String, required: true }],
    correctiveActions: [CorrectiveActionSchema],
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress'
    }
  },
  { _id: false }
);

const IncidentSchema = new Schema<IIncident>(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      index: true
    },
    patientName: {
      type: String,
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
    type: {
      type: String,
      enum: Object.values(IncidentType),
      required: true,
      index: true
    },
    severity: {
      type: String,
      enum: Object.values(IncidentSeverity),
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: Object.values(IncidentStatus),
      required: true,
      default: IncidentStatus.REPORTED,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    location: {
      building: { type: String },
      floor: { type: String },
      room: { type: String },
      area: { type: String, required: true },
      coordinates: {
        latitude: { type: Number },
        longitude: { type: Number }
      }
    },
    incidentDate: {
      type: Date,
      required: true,
      index: true
    },
    incidentTime: {
      type: String,
      required: true
    },
    reportedDate: {
      type: Date,
      required: true,
      default: Date.now
    },
    lastModified: {
      type: Date,
      required: true,
      default: Date.now
    },
    reportedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      department: { type: String }
    },
    injuries: [IncidentInjurySchema],
    witnesses: [IncidentWitnessSchema],
    investigation: IncidentInvestigationSchema,
    resolution: {
      resolvedBy: { type: String },
      resolvedByName: { type: String },
      resolutionDate: { type: Date },
      resolutionSummary: { type: String },
      followUpRequired: { type: Boolean, default: false },
      followUpDate: { type: Date }
    },
    escalation: {
      escalatedBy: { type: String },
      escalatedByName: { type: String },
      escalationDate: { type: Date },
      escalatedTo: { type: String },
      escalationReason: { type: String },
      previousSeverity: { type: String }
    },
    safeguardingConcernId: {
      type: String,
      index: true
    },
    medicalReview: {
      reviewedBy: { type: String },
      reviewDate: { type: Date },
      medicalClearanceRequired: { type: Boolean, default: false },
      clearanceGiven: { type: Boolean },
      clearanceDate: { type: Date },
      notes: { type: String }
    },
    attachments: [{ type: String }],
    notes: [{ type: String }],
    regulatoryReportable: {
      type: Boolean,
      default: false,
      index: true
    },
    regulatoryReportNumber: { type: String },
    policeNotified: {
      type: Boolean,
      default: false
    },
    familyNotified: {
      type: Boolean,
      default: false
    },
    tags: [{ type: String }],
    priority: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'incidents'
  }
);

// Compound indexes for common queries
IncidentSchema.index({ incidentDate: 1, facilityId: 1 });
IncidentSchema.index({ patientId: 1, incidentDate: -1 });
IncidentSchema.index({ status: 1, severity: 1 });
IncidentSchema.index({ type: 1, severity: 1, incidentDate: -1 });
IncidentSchema.index({ facilityId: 1, status: 1, incidentDate: -1 });

// Safeguarding Concern Schema
const SafeguardingConcernSchema = new Schema<ISafeguarding>(
  {
    concernId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    concernType: {
      type: String,
      enum: Object.values(ConcernType),
      required: true
    },
    description: {
      type: String,
      required: true
    },
    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      required: true,
      default: RiskLevel.MEDIUM
    },
    previousRiskLevel: {
      type: String,
      enum: Object.values(RiskLevel)
    },
    vulnerablePerson: {
      personId: { type: String, required: true, index: true },
      name: { type: String, required: true },
      dateOfBirth: { type: Date },
      gender: { type: String },
      careType: { type: String },
      careLocation: { type: String }
    },
    concernRaisedBy: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      role: { type: String, required: true },
      department: { type: String },
      contactNumber: { type: String }
    },
    incidentLinked: {
      type: String,
      index: true
    },
    immediateActions: [
      {
        action: { type: String, required: true },
        takenBy: { type: String, required: true },
        takenAt: { type: Date, required: true },
        effectiveness: { type: String }
      }
    ],
    riskAssessment: {
      assessedBy: { type: String },
      assessmentDate: { type: Date },
      riskScore: { type: Number, default: 0 },
      riskFactors: [{ type: String }],
      protectiveFactors: [{ type: String }],
      riskLevelJustification: { type: String }
    },
    authorities: [
      {
        authorityName: { type: String, required: true },
        contactDate: { type: Date, required: true },
        contactPerson: { type: String },
        contactMethod: { type: String },
        referenceNumber: { type: String },
        outcome: { type: String },
        followUpRequired: { type: Boolean, default: false }
      }
    ],
    protectionPlan: {
      planId: { type: String },
      createdDate: { type: Date },
      createdBy: { type: String },
      measures: [
        {
          measure: { type: String, required: true },
          responsibleParty: { type: String, required: true },
          startDate: { type: Date, required: true },
          endDate: { type: Date },
          status: {
            type: String,
            enum: ['planned', 'active', 'completed', 'cancelled'],
            default: 'planned'
          }
        }
      ],
      reviewDate: { type: Date },
      nextReviewDate: { type: Date },
      status: {
        type: String,
        enum: ['draft', 'active', 'under_review', 'closed'],
        default: 'draft'
      },
      notes: { type: String }
    },
    outcomes: [
      {
        outcome: { type: String, required: true },
        achievedDate: { type: Date },
        achievedBy: { type: String },
        notes: { type: String }
      }
    ],
    status: {
      type: String,
      enum: ['raised', 'assessing', 'investigating', 'plan_in_place', 'resolved', 'closed'],
      default: 'raised',
      index: true
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        changedBy: { type: String, required: true },
        changedAt: { type: Date, required: true },
        notes: { type: String }
      }
    ],
    relatedConcerns: [{ type: String }],
    attachments: [{ type: String }],
    followUpSchedule: [
      {
        scheduledDate: { type: Date, required: true },
        purpose: { type: String, required: true },
        completed: { type: Boolean, default: false },
        completedDate: { type: Date },
        completedBy: { type: String }
      }
    ]
  },
  {
    timestamps: true,
    collection: 'safeguarding_concerns'
  }
);

// Compound indexes
SafeguardingConcernSchema.index({ vulnerablePerson.personId: 1, riskLevel: 1 });
SafeguardingConcernSchema.index({ riskLevel: 1, status: 1 });
SafeguardingConcernSchema.index({ concernType: 1, riskLevel: 1 });

// ============================================================================
// MODEL EXPORTS
// ============================================================================

export const Incident = mongoose.model<IIncident>('Incident', IncidentSchema);
export const Safeguarding = mongoose.model<ISafeguarding>('Safeguarding', SafeguardingConcernSchema);

// Type exports for service use
export type IncidentDocument = IIncident;
export type SafeguardingDocument = ISafeguarding;
