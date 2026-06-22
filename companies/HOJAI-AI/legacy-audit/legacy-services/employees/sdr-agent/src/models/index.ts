// ============================================
// HOJAI AI - SDR Agent MongoDB Models
// ============================================

import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  LeadStage,
  LeadSource,
  LeadScore,
  OutreachChannel,
  OutreachStatus,
  FollowupStatus,
  QualificationStatus
} from '../types';

// ============================================
// Contact Model
// ============================================

export interface IContactDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  title?: string;
  company?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  companyId?: mongoose.Types.ObjectId;
}

const ContactSchema = new Schema<IContactDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    firstName: { type: String, required: true, maxlength: 100 },
    lastName: { type: String, maxlength: 100 },
    email: { type: String, sparse: true, lowercase: true },
    phone: { type: String },
    linkedinUrl: { type: String },
    title: { type: String, maxlength: 200 },
    company: { type: String, maxlength: 200 },
    companySize: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    industry: { type: String, maxlength: 100 },
    location: {
      city: String,
      state: String,
      country: String
    },
    metadata: { type: Schema.Types.Mixed },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' }
  },
  {
    timestamps: true,
    collection: 'sdr_contacts'
  }
);

// Compound index for tenant + email
ContactSchema.index({ tenantId: 1, email: 1 }, { unique: true, sparse: true });

// ============================================
// Company Model
// ============================================

export interface ICompanyDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';
  revenue?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CompanySchema = new Schema<ICompanyDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 200 },
    domain: { type: String },
    industry: { type: String, maxlength: 100 },
    size: {
      type: String,
      enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']
    },
    revenue: String,
    location: {
      city: String,
      state: String,
      country: String
    },
    linkedinUrl: String,
    crunchbaseUrl: String,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'sdr_companies'
  }
);

CompanySchema.index({ tenantId: 1, domain: 1 }, { unique: true, sparse: true });

// ============================================
// Lead Model
// ============================================

export interface ILeadDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  contactId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  stage: LeadStage;
  source: LeadSource;
  score: LeadScore;
  scoreValue: number;
  ownerId: string;
  assignedTo?: string;
  lastContactedAt?: Date;
  nextFollowupAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILeadDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    stage: {
      type: String,
      enum: Object.values(LeadStage),
      default: LeadStage.NEW,
      index: true
    },
    source: {
      type: String,
      enum: Object.values(LeadSource),
      default: LeadSource.COLD_OUTREACH
    },
    score: {
      type: String,
      enum: Object.values(LeadScore),
      default: LeadScore.COLD
    },
    scoreValue: { type: Number, default: 0, min: 0, max: 100 },
    ownerId: { type: String, required: true },
    assignedTo: String,
    lastContactedAt: Date,
    nextFollowupAt: Date,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'sdr_leads'
  }
);

LeadSchema.index({ tenantId: 1, stage: 1 });
LeadSchema.index({ tenantId: 1, score: 1 });
LeadSchema.index({ tenantId: 1, assignedTo: 1 });
LeadSchema.index({ tenantId: 1, nextFollowupAt: 1 });
LeadSchema.index({ tenantId: 1, contactId: 1 }, { unique: true });

// ============================================
// Qualification Model
// ============================================

export interface IQualificationDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  leadId: mongoose.Types.ObjectId;
  status: QualificationStatus;
  bant: {
    budget: {
      hasBudget: boolean;
      amount?: number;
      currency: string;
      comments?: string;
    };
    authority: {
      level: 'individual' | 'manager' | 'director' | 'vp' | 'cxo' | 'unknown';
      isDecisionMaker: boolean;
      involvesOthers?: boolean;
      comments?: string;
    };
    need: {
      painPoints: string[];
      priority: 'low' | 'medium' | 'high' | 'critical';
      businessImpact?: string;
    };
    timeline: {
      targetClose?: Date;
      buyingStage: 'awareness' | 'consideration' | 'decision' | 'none';
      urgency: 'low' | 'medium' | 'high';
    };
  };
  notes: string;
  disqualifyReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QualificationSchema = new Schema<IQualificationDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    status: {
      type: String,
      enum: Object.values(QualificationStatus),
      default: QualificationStatus.NOT_QUALIFIED
    },
    bant: {
      budget: {
        hasBudget: { type: Boolean, required: true },
        amount: Number,
        currency: { type: String, default: 'USD' },
        comments: String
      },
      authority: {
        level: {
          type: String,
          enum: ['individual', 'manager', 'director', 'vp', 'cxo', 'unknown'],
          default: 'unknown'
        },
        isDecisionMaker: { type: Boolean, required: true },
        involvesOthers: Boolean,
        comments: String
      },
      need: {
        painPoints: { type: [String], default: [] },
        priority: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium'
        },
        businessImpact: String
      },
      timeline: {
        targetClose: Date,
        buyingStage: {
          type: String,
          enum: ['awareness', 'consideration', 'decision', 'none'],
          default: 'none'
        },
        urgency: {
          type: String,
          enum: ['low', 'medium', 'high'],
          default: 'low'
        }
      }
    },
    notes: { type: String, default: '' },
    disqualifyReason: String
  },
  {
    timestamps: true,
    collection: 'sdr_qualifications'
  }
);

QualificationSchema.index({ tenantId: 1, leadId: 1 }, { unique: true });

// ============================================
// Outreach Model
// ============================================

export interface IOutreachDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  leadId: mongoose.Types.ObjectId;
  channel: OutreachChannel;
  status: OutreachStatus;
  subject?: string;
  body: string;
  templateId?: string;
  personalization?: Record<string, string>;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OutreachSchema = new Schema<IOutreachDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    channel: {
      type: String,
      enum: Object.values(OutreachChannel),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(OutreachStatus),
      default: OutreachStatus.PENDING,
      index: true
    },
    subject: String,
    body: { type: String, required: true },
    templateId: String,
    personalization: { type: Schema.Types.Mixed },
    sentAt: Date,
    deliveredAt: Date,
    openedAt: Date,
    clickedAt: Date,
    repliedAt: Date,
    errorMessage: String,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'sdr_outreaches'
  }
);

OutreachSchema.index({ tenantId: 1, leadId: 1 });
OutreachSchema.index({ tenantId: 1, status: 1 });
OutreachSchema.index({ tenantId: 1, sentAt: 1 });

// ============================================
// Followup Model
// ============================================

export interface IFollowupDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  leadId: mongoose.Types.ObjectId;
  outreachId?: mongoose.Types.ObjectId;
  channel: OutreachChannel;
  status: FollowupStatus;
  scheduledFor: Date;
  message?: string;
  sentAt?: Date;
  completedAt?: Date;
  skippedReason?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const FollowupSchema = new Schema<IFollowupDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    outreachId: { type: Schema.Types.ObjectId, ref: 'Outreach' },
    channel: {
      type: String,
      enum: Object.values(OutreachChannel),
      required: true
    },
    status: {
      type: String,
      enum: Object.values(FollowupStatus),
      default: FollowupStatus.SCHEDULED,
      index: true
    },
    scheduledFor: { type: Date, required: true, index: true },
    message: String,
    sentAt: Date,
    completedAt: Date,
    skippedReason: String,
    metadata: { type: Schema.Types.Mixed }
  },
  {
    timestamps: true,
    collection: 'sdr_followups'
  }
);

FollowupSchema.index({ tenantId: 1, leadId: 1 });
FollowupSchema.index({ tenantId: 1, status: 1, scheduledFor: 1 });

// ============================================
// Activity Model (for timeline/audit)
// ============================================

export interface IActivityDocument extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  leadId: mongoose.Types.ObjectId;
  type: 'stage_change' | 'outreach' | 'followup' | 'note' | 'email_opened' | 'email_clicked' | 'email_replied' | 'call' | 'meeting';
  description: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivityDocument>(
  {
    tenantId: { type: String, required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    type: {
      type: String,
      enum: ['stage_change', 'outreach', 'followup', 'note', 'email_opened', 'email_clicked', 'email_replied', 'call', 'meeting'],
      required: true
    },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
    createdBy: { type: String, required: true }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'sdr_activities'
  }
);

ActivitySchema.index({ tenantId: 1, leadId: 1, createdAt: -1 });

// ============================================
// Export Models
// ============================================

export const Contact = mongoose.model<IContactDocument>('Contact', ContactSchema);
export const Company = mongoose.model<ICompanyDocument>('Company', CompanySchema);
export const Lead = mongoose.model<ILeadDocument>('Lead', LeadSchema);
export const Qualification = mongoose.model<IQualificationDocument>('Qualification', QualificationSchema);
export const Outreach = mongoose.model<IOutreachDocument>('Outreach', OutreachSchema);
export const Followup = mongoose.model<IFollowupDocument>('Followup', FollowupSchema);
export const Activity = mongoose.model<IActivityDocument>('Activity', ActivitySchema);

// Type exports for services
export type ContactModel = Model<IContactDocument>;
export type CompanyModel = Model<ICompanyDocument>;
export type LeadModel = Model<ILeadDocument>;
export type QualificationModel = Model<IQualificationDocument>;
export type OutreachModel = Model<IOutreachDocument>;
export type FollowupModel = Model<IFollowupDocument>;
export type ActivityModel = Model<IActivityDocument>;
