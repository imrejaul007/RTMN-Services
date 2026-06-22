import mongoose, { Schema, Document } from 'mongoose';

export type BNPLStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'paid' | 'overdue' | 'defaulted';
export type BNPLTenure = 3 | 6 | 9 | 12; // months

export interface IBNPLApplication extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  merchantId?: mongoose.Types.ObjectId;
  orderId: string;
  amount: number;
  tenure: BNPLTenure;
  status: BNPLStatus;
  interestRate: number; // APR
  processingFee: number;
  emiAmount: number;
  totalAmount: number;
  totalInterest: number;
  downPayment: number;
  creditScore?: number;
  riskRating: 'low' | 'medium' | 'high';
  approvedAt?: Date;
  activatedAt?: Date;
  firstEmiDate: Date;
  nextEmiDate: Date;
  emiSchedule: IEMISchedule[];
  payments: IPaymentRecord[];
  overdueDays: number;
  overdueAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEMISchedule {
  emiNumber: number;
  dueDate: Date;
  principal: number;
  interest: number;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
  paidAt?: Date;
  transactionId?: string;
}

export interface IPaymentRecord {
  emiNumber: number;
  amount: number;
  principal: number;
  interest: number;
  paidAt: Date;
  transactionId: string;
  paymentMethod: 'wallet' | 'upi' | 'card' | 'auto-debit';
}

const EMIScheduleSchema = new Schema({
  emiNumber: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  principal: { type: Number, required: true },
  interest: { type: Number, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
  paidAt: Date,
  transactionId: String
}, { _id: false });

const PaymentRecordSchema = new Schema({
  emiNumber: { type: Number, required: true },
  amount: { type: Number, required: true },
  principal: { type: Number, required: true },
  interest: { type: Number, required: true },
  paidAt: { type: Date, required: true },
  transactionId: { type: String, required: true },
  paymentMethod: { type: String, enum: ['wallet', 'upi', 'card', 'auto-debit'], required: true }
}, { _id: false });

const BNPLApplicationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant' },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true, min: 500, max: 500000 },
  tenure: { type: Number, enum: [3, 6, 9, 12], required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active', 'paid', 'overdue', 'defaulted'],
    default: 'pending',
    index: true
  },
  interestRate: { type: Number, required: true }, // APR
  processingFee: { type: Number, default: 0 },
  emiAmount: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  totalInterest: { type: Number, required: true },
  downPayment: { type: Number, default: 0 },
  creditScore: Number,
  riskRating: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  approvedAt: Date,
  activatedAt: Date,
  firstEmiDate: { type: Date, required: true },
  nextEmiDate: { type: Date, required: true },
  emiSchedule: [EMIScheduleSchema],
  payments: [PaymentRecordSchema],
  overdueDays: { type: Number, default: 0 },
  overdueAmount: { type: Number, default: 0 }
}, { timestamps: true });

BNPLApplicationSchema.index({ userId: 1, status: 1 });
BNPLApplicationSchema.index({ nextEmiDate: 1, status: 1 });

export const BNPLApplication = mongoose.models.BNPLApplication ||
  mongoose.model<IBNPLApplication>('BNPLApplication', BNPLApplicationSchema);
