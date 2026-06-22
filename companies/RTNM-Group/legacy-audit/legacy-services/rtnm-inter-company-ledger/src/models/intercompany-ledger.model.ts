import mongoose, { Document, Schema, Model } from 'mongoose';

// Entry Types
export type EntryType =
  | 'SERVICE_FEE'
  | 'REVENUE_SHARE'
  | 'API_USAGE'
  | 'DATA_SHARING'
  | 'MARKETING_FEE'
  | 'INFRASTRUCTURE_COST'
  | 'SUPPORT_FEE'
  | 'REFERRAL_COMMISSION'
  | 'LOYALTY_REWARD'
  | 'SETTLEMENT';

export type Currency = 'INR' | 'USD' | 'EUR';

export interface ILedgerEntry extends Document {
  entryId: string;
  fromCorpId: string;
  toCorpId: string;
  type: EntryType;
  amount: number;
  currency: Currency;
  description: string;
  metadata?: Record<string, unknown>;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  reconciledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICompanyBalance extends Document {
  corpId: string;
  revenue: number;
  cost: number;
  net: number;
  pendingRevenue: number;
  pendingCost: number;
  lastSettledAt?: Date;
  updatedAt: Date;
}

// Ledger Entry Schema
const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    entryId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromCorpId: {
      type: String,
      required: true,
      index: true,
    },
    toCorpId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'SERVICE_FEE',
        'REVENUE_SHARE',
        'API_USAGE',
        'DATA_SHARING',
        'MARKETING_FEE',
        'INFRASTRUCTURE_COST',
        'SUPPORT_FEE',
        'REFERRAL_COMMISSION',
        'LOYALTY_REWARD',
        'SETTLEMENT',
      ],
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      enum: ['INR', 'USD', 'EUR'],
      default: 'INR',
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    reconciledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common queries
LedgerEntrySchema.index({ fromCorpId: 1, createdAt: -1 });
LedgerEntrySchema.index({ toCorpId: 1, createdAt: -1 });
LedgerEntrySchema.index({ fromCorpId: 1, toCorpId: 1, createdAt: -1 });
LedgerEntrySchema.index({ status: 1, type: 1 });

// Company Balance Schema
const CompanyBalanceSchema = new Schema<ICompanyBalance>(
  {
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    revenue: {
      type: Number,
      default: 0,
    },
    cost: {
      type: Number,
      default: 0,
    },
    net: {
      type: Number,
      default: 0,
    },
    pendingRevenue: {
      type: Number,
      default: 0,
    },
    pendingCost: {
      type: Number,
      default: 0,
    },
    lastSettledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual to calculate pending net
CompanyBalanceSchema.virtual('pendingNet').get(function () {
  return this.pendingRevenue - this.pendingCost;
});

// Static method to update balance
CompanyBalanceSchema.statics.updateBalance = async function (
  corpId: string,
  amount: number,
  isRevenue: boolean,
  isPending: boolean = false
): Promise<void> {
  const update: Record<string, number> = {};
  if (isRevenue) {
    if (isPending) {
      update.$inc = { pendingRevenue: amount };
    } else {
      update.$inc = { revenue: amount };
    }
  } else {
    if (isPending) {
      update.$inc = { pendingCost: amount };
    } else {
      update.$inc = { cost: amount };
    }
  }

  await this.findOneAndUpdate(
    { corpId },
    {
      $inc: isRevenue
        ? isPending
          ? { pendingRevenue: amount }
          : { revenue: amount }
        : isPending
        ? { pendingCost: amount }
        : { cost: amount },
      $set: { net: 0 }, // Will be recalculated
    },
    { upsert: true, new: true }
  );

  // Recalculate net
  const balance = await this.findOne({ corpId });
  if (balance) {
    balance.net = balance.revenue - balance.cost;
    await balance.save();
  }
};

// Export models
export const LedgerEntry: Model<ILedgerEntry> = mongoose.model<ILedgerEntry>(
  'LedgerEntry',
  LedgerEntrySchema
);

export const CompanyBalance: Model<ICompanyBalance> = mongoose.model<ICompanyBalance>(
  'CompanyBalance',
  CompanyBalanceSchema
);

export const LedgerEntryModel = LedgerEntry;
export const CompanyBalanceModel = CompanyBalance;
