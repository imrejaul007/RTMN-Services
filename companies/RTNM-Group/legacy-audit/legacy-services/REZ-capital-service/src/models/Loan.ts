import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export type LoanType = 'revenue_advance' | 'term_loan' | 'credit_line';
export type LoanStatus = 'pending' | 'approved' | 'disbursed' | 'repaid' | 'defaulted';

export interface IRepaymentEntry {
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  status: 'pending' | 'paid' | 'overdue';
  paidDate?: Date;
  paidAmount?: number;
}

export interface ILoan extends Document {
  merchantId: string;
  type: LoanType;
  amount: number;
  disbursedAmount: number;
  interestRate: number;
  tenure: number; // days
  status: LoanStatus;
  repaymentSchedule: IRepaymentEntry[];
  nextRepayment: Date;
  partnerRef?: string;
  partnerId?: string;
  createdAt: Date;
  disbursedAt?: Date;
  completedAt?: Date;
  // Metadata
  purpose?: string;
  approvedBy?: string;
  approvedAt?: Date;
}

const RepaymentEntrySchema = new Schema<IRepaymentEntry>(
  {
    dueDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    principal: { type: Number, required: true, min: 0 },
    interest: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['pending', 'paid', 'overdue'],
      default: 'pending',
    },
    paidDate: { type: Date },
    paidAmount: { type: Number, min: 0 },
  },
  { _id: true }
);

const LoanSchema = new Schema<ILoan>(
  {
    merchantId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['revenue_advance', 'term_loan', 'credit_line'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    disbursedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    interestRate: {
      type: Number,
      required: true,
      min: 0,
    },
    tenure: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'disbursed', 'repaid', 'defaulted'],
      default: 'pending',
      index: true,
    },
    repaymentSchedule: [RepaymentEntrySchema],
    nextRepayment: {
      type: Date,
    },
    partnerRef: {
      type: String,
    },
    partnerId: {
      type: String,
    },
    disbursedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    purpose: {
      type: String,
    },
    approvedBy: {
      type: String,
    },
    approvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
LoanSchema.index({ merchantId: 1, status: 1 });
LoanSchema.index({ status: 1, nextRepayment: 1 });
LoanSchema.index({ createdAt: -1 });

export const Loan: Model<ILoan> = mongoose.model<ILoan>('Loan', LoanSchema);
