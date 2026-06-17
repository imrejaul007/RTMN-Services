import mongoose, { Document, Schema, Model } from 'mongoose';
import { PaymentMethod } from './Invoice';

// Payment record document interface
export interface IPaymentRecord extends Document {
  paymentId: string;
  invoiceId: string;
  tenantId: string;
  customerId: string;
  amount: number;
  method: PaymentMethod;
  date: Date;
  reference?: string;
  notes?: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    invoiceId: {
      type: String,
      required: true,
      index: true,
    },
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reference: String,
    notes: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    collection: 'payment_records',
  }
);

// Compound indexes
PaymentRecordSchema.index({ tenantId: 1, invoiceId: 1 });
PaymentRecordSchema.index({ tenantId: 1, customerId: 1 });
PaymentRecordSchema.index({ tenantId: 1, date: -1 });
PaymentRecordSchema.index({ transactionId: 1 }, { sparse: true });

// Virtual for checking if payment can be refunded
PaymentRecordSchema.virtual('canRefund').get(function () {
  return this.status === 'completed' && !this.metadata?.refundedAt;
});

// Instance method to mark as refunded
PaymentRecordSchema.methods.markAsRefunded = function (reason?: string): void {
  this.status = 'refunded';
  if (!this.metadata) this.metadata = {};
  this.metadata.refundedAt = new Date();
  this.metadata.refundReason = reason;
};

// Static method to get total payments for an invoice
PaymentRecordSchema.statics.getTotalPayments = async function (
  invoiceId: string,
  tenantId: string
): Promise<number> {
  const result = await this.aggregate([
    {
      $match: {
        invoiceId,
        tenantId,
        status: 'completed',
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' },
      },
    },
  ]);

  return result.length > 0 ? result[0].total : 0;
};

// Static method to get payment statistics
PaymentRecordSchema.statics.getPaymentStats = async function (
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  const stats = await this.aggregate([
    {
      $match: {
        tenantId,
        date: { $gte: startDate, $lte: endDate },
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        total: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        method: '$_id',
        count: 1,
        total: { $round: ['$total', 2] },
      },
    },
    {
      $sort: { total: -1 },
    },
  ]);

  return stats;
};

const PaymentRecord: Model<IPaymentRecord> = mongoose.model<IPaymentRecord>(
  'PaymentRecord',
  PaymentRecordSchema
);

export default PaymentRecord;
