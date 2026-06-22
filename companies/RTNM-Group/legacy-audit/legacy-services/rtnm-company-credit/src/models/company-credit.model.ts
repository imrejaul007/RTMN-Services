import mongoose, { Document, Schema } from 'mongoose';

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  OVERDUE = 'OVERDUE',
}

export interface IPaymentHistory {
  transactionId: string;
  amount: number;
  date: Date;
  status: PaymentStatus;
  description: string;
  dueDate?: Date;
  paidDate?: Date;
}

export interface ICompanyCredit extends Document {
  corpId: string;
  companyName: string;
  creditLimit: number;
  currentUtilization: number;
  availableCredit: number;
  paymentHistory: IPaymentHistory[];
  riskLevel: RiskLevel;
  creditScore: number;
  paymentTermsDays: number;
  lastPaymentDate?: Date;
  nextPaymentDue?: Date;
  totalOutstanding: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentHistorySchema = new Schema<IPaymentHistory>(
  {
    transactionId: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      required: true,
    },
    description: { type: String, required: true },
    dueDate: { type: Date },
    paidDate: { type: Date },
  },
  { _id: false }
);

const CompanyCreditSchema = new Schema<ICompanyCredit>(
  {
    corpId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    creditLimit: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currentUtilization: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    availableCredit: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentHistory: {
      type: [PaymentHistorySchema],
      default: [],
    },
    riskLevel: {
      type: String,
      enum: Object.values(RiskLevel),
      default: RiskLevel.MEDIUM,
    },
    creditScore: {
      type: Number,
      default: 750,
      min: 300,
      max: 900,
    },
    paymentTermsDays: {
      type: Number,
      default: 30,
      min: 0,
      max: 180,
    },
    lastPaymentDate: {
      type: Date,
    },
    nextPaymentDue: {
      type: Date,
    },
    totalOutstanding: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
CompanyCreditSchema.index({ riskLevel: 1 });
CompanyCreditSchema.index({ creditScore: -1 });
CompanyCreditSchema.index({ updatedAt: -1 });
CompanyCreditSchema.index({ companyName: 'text' });

// Pre-save hook to calculate available credit
CompanyCreditSchema.pre('save', function (next) {
  this.availableCredit = Math.max(0, this.creditLimit - this.currentUtilization);
  next();
});

export const CompanyCredit = mongoose.model<ICompanyCredit>(
  'CompanyCredit',
  CompanyCreditSchema
);

export interface CreditCheckResult {
  canExtend: boolean;
  availableCredit: number;
  requestedAmount: number;
  riskLevel: RiskLevel;
  message: string;
}

export interface PaymentTermsResult {
  corpId: string;
  paymentTermsDays: number;
  creditLimit: number;
  availableCredit: number;
  currency: string;
  riskLevel: RiskLevel;
  creditScore: number;
}