import mongoose, { Document, Schema, Types } from 'mongoose';

export enum DealStage {
  PROSPECT = 'prospect',
  QUALIFICATION = 'qualification',
  PROPOSAL = 'proposal',
  NEGOTIATION = 'negotiation',
  CLOSED_WON = 'closed_won',
  CLOSED_LOST = 'closed_lost',
}

export const STAGE_PROBABILITY: Record<DealStage, number> = {
  [DealStage.PROSPECT]: 10,
  [DealStage.QUALIFICATION]: 25,
  [DealStage.PROPOSAL]: 50,
  [DealStage.NEGOTIATION]: 75,
  [DealStage.CLOSED_WON]: 100,
  [DealStage.CLOSED_LOST]: 0,
};

export interface IExternalIds {
  hubspotId?: string;
  zohoId?: string;
}

export interface IDeal extends Document {
  tenantId: string;
  title: string;
  value: number;
  stage: DealStage;
  probability: number;
  contactId: Types.ObjectId;
  expectedClose?: Date;
  externalIds: IExternalIds;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    stage: {
      type: String,
      enum: Object.values(DealStage),
      default: DealStage.PROSPECT,
    },
    probability: {
      type: Number,
      min: 0,
      max: 100,
    },
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'Contact',
      required: true,
    },
    expectedClose: {
      type: Date,
    },
    externalIds: {
      hubspotId: { type: String },
      zohoId: { type: String },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Auto-update probability when stage changes
DealSchema.pre('save', function (next) {
  if (this.isModified('stage')) {
    this.probability = STAGE_PROBABILITY[this.stage];
  }
  next();
});

DealSchema.index(['tenantId', 'stage']);

export const Deal = mongoose.model<IDeal>('Deal', DealSchema);
