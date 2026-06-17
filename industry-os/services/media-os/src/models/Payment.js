/**
 * Media OS - Payment Model
 * Transaction records for all payments
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Transaction
  transactionId: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['subscription', 'campaign', 'royalty', 'payout', 'refund', 'deposit', 'withdrawal', 'transfer'],
    required: true,
  },

  // Parties
  from: {
    type: { type: String, enum: ['viewer', 'advertiser', 'creator', 'platform', 'partner'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    accountType: String,
  },
  to: {
    type: { type: String, enum: ['viewer', 'creator', 'advertiser', 'platform', 'partner', 'vendor'] },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    accountType: String,
  },

  // Amount
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Breakdown
  breakdown: {
    baseAmount: Number,
    tax: Number,
    fees: Number,
    discount: Number,
    total: Number,
  },

  // Reference
  reference: {
    type: { type: String, enum: ['subscription', 'campaign', 'invoice', 'booking', 'withdrawal', 'payout'] },
    id: mongoose.Schema.Types.ObjectId,
    invoiceNumber: String,
  },

  // Payment method
  method: {
    type: { type: String, enum: ['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'razorpay', 'cashfree'] },
    cardBrand: String,
    cardLast4: String,
    upiId: String,
    bankName: String,
    accountNumber: String,
  },

  // Gateway
  gateway: {
    name: String,
    transactionId: String,
    orderId: String,
    paymentId: String,
    signature: String,
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'timeout'],
    default: 'pending',
  },

  // Timeline
  initiatedAt: Date,
  processedAt: Date,
  completedAt: Date,
  failedAt: Date,
  refundAt: Date,

  // Error
  error: {
    code: String,
    message: String,
    raw: mongoose.Schema.Types.Mixed,
  },

  // RTMN Integration
  twinId: String,
  walletTransactionId: String, // RABTUL wallet reference

  // Audit
  idempotencyKey: String,
  retryCount: { type: Number, default: 0 },
  metadata: mongoose.Schema.Types.Mixed,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Generate transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const prefix = {
      subscription: 'SUB',
      campaign: 'CMP',
      royalty: 'ROY',
      payout: 'PAY',
      refund: 'REF',
      deposit: 'DEP',
      withdrawal: 'WDL',
      transfer: 'TRF',
    }[this.type] || 'TXN';

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.transactionId = `${prefix}-${timestamp}-${random}`;
  }
  next();
});

// Indexes
paymentSchema.index({ transactionId: 1 }, { unique: true });
paymentSchema.index({ 'from.id': 1, type: 1, createdAt: -1 });
paymentSchema.index({ 'to.id': 1, type: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ 'reference.type': 1, 'reference.id': 1 });
paymentSchema.index({ 'gateway.transactionId': 1 });

// Methods
paymentSchema.methods.markCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
  return this;
};

paymentSchema.methods.markFailed = async function(error) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.error = error;
  await this.save();
  return this;
};

paymentSchema.methods.initiateRefund = async function(reason) {
  const refund = this.constructor({
    type: 'refund',
    from: this.to,
    to: this.from,
    amount: this.breakdown?.total || this.amount,
    reference: { type: 'refund', id: this._id },
    status: 'pending',
    metadata: { originalTransactionId: this.transactionId, reason },
  });
  await refund.save();
  return refund;
};

// Statics
paymentSchema.statics.findByUser = function(userId, type = null) {
  const query = {
    $or: [
      { 'from.id': userId },
      { 'to.id': userId },
    ],
  };
  if (type) query.type = type;

  return this.find(query).sort({ createdAt: -1 });
};

paymentSchema.statics.getStats = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        $or: [{ 'from.id': userId }, { 'to.id': userId }],
        status: 'completed',
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$type',
        totalIn: {
          $sum: { $cond: [{ $eq: ['$to.id', userId] }, '$amount', 0] },
        },
        totalOut: {
          $sum: { $cond: [{ $eq: ['$from.id', userId] }, '$amount', 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);
};

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
