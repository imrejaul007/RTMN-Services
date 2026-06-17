import mongoose, { Document, Schema, Types } from 'mongoose';

// Lead Source Types
export enum LeadSource {
  WEB = 'web',
  REFERRAL = 'referral',
  AD = 'ad',
  SOCIAL = 'social',
  EVENT = 'event',
  PARTNER = 'partner',
  CAMPAIGN = 'campaign',
}

// Lead Stage Types
export enum LeadStage {
  NEW = 'new',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  WON = 'won',
  LOST = 'lost',
}

// Stage Probability for Scoring
export const STAGE_PROBABILITY: Record<LeadStage, number> = {
  [LeadStage.NEW]: 10,
  [LeadStage.CONTACTED]: 25,
  [LeadStage.QUALIFIED]: 50,
  [LeadStage.PROPOSAL]: 75,
  [LeadStage.NEGOTIATION]: 90,
  [LeadStage.WON]: 100,
  [LeadStage.LOST]: 0,
};

// Scoring Factor Interface
export interface IScoreFactor {
  name: string;
  value: number;
  weight?: number;
}

// Lead Score Interface
export interface ILeadScore {
  total: number;
  factors: IScoreFactor[];
  lastCalculated: Date;
}

// Enrichment Data Interface
export interface IEnrichmentData {
  linkedin?: {
    url?: string;
    headline?: string;
    connections?: number;
    industry?: string;
  };
  companyData?: {
    name?: string;
    domain?: string;
    industry?: string;
    size?: string;
    revenue?: string;
    founded?: number;
    description?: string;
    logo?: string;
  };
  socialData?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}

// Lead Interface
export interface ILead extends Document {
  tenantId: string;
  leadId: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: LeadSource;
  stage: LeadStage;
  score: ILeadScore;
  enrichment: IEnrichmentData;
  ownerId?: string;
  temperature?: 'hot' | 'warm' | 'cold';
  tags: string[];
  metadata: Record<string, unknown>;
  isConverted: boolean;
  convertedAt?: Date;
  convertedToContactId?: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Lead Schema
const LeadSchema = new Schema<ILead>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    leadId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    source: {
      type: String,
      enum: Object.values(LeadSource),
      default: LeadSource.WEB,
    },
    stage: {
      type: String,
      enum: Object.values(LeadStage),
      default: LeadStage.NEW,
    },
    score: {
      total: { type: Number, default: 0 },
      factors: [
        new Schema(
          {
            name: { type: String, required: true },
            value: { type: Number, required: true },
            weight: { type: Number, default: 1 },
          },
          { _id: false }
        ),
      ],
      lastCalculated: { type: Date, default: Date.now },
    },
    enrichment: {
      linkedin: {
        url: String,
        headline: String,
        connections: Number,
        industry: String,
      },
      companyData: {
        name: String,
        domain: String,
        industry: String,
        size: String,
        revenue: String,
        founded: Number,
        description: String,
        logo: String,
      },
      socialData: {
        twitter: String,
        facebook: String,
        instagram: String,
        website: String,
      },
    },
    ownerId: {
      type: String,
    },
    temperature: {
      type: String,
      enum: ['hot', 'warm', 'cold'],
    },
    tags: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isConverted: {
      type: Boolean,
      default: false,
    },
    convertedAt: {
      type: Date,
    },
    convertedToContactId: {
      type: Schema.Types.ObjectId,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
LeadSchema.index(['tenantId', 'isDeleted']);
LeadSchema.index(['tenantId', 'stage']);
LeadSchema.index(['tenantId', 'email']);
LeadSchema.index(['tenantId', 'ownerId']);
LeadSchema.index(['tenantId', 'temperature']);
LeadSchema.index(['tenantId', 'source']);
LeadSchema.index(['tenantId', 'score.total']);
LeadSchema.index(['tenantId', 'createdAt']);

// Pre-save hook to set temperature based on score
LeadSchema.pre('save', function (next) {
  if (this.score && this.score.total > 0) {
    if (this.score.total >= 70) {
      this.temperature = 'hot';
    } else if (this.score.total >= 40) {
      this.temperature = 'warm';
    } else {
      this.temperature = 'cold';
    }
  }
  next();
});

export const Lead = mongoose.model<ILead>('Lead', LeadSchema);
