/**
 * Media OS - Subscription Model
 * Viewer subscriptions and plans
 */

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  // Viewer
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
  corpid: String,

  // Plan
  plan: {
    type: { type: String, enum: ['free', 'basic', 'premium', 'family', 'vip'], required: true },
    name: String,
    description: String,
  },

  // Pricing
  pricing: {
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    billingCycle: { type: String, enum: ['monthly', 'quarterly', 'yearly'], default: 'monthly' },
    discount: { type: Number, default: 0 }, // percentage
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'paused', 'cancelled', 'expired', 'pending', 'trial'],
    default: 'active',
  },

  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  nextBillingDate: Date,
  trialEndDate: Date,

  // Payment
  payment: {
    method: { type: String, enum: ['card', 'upi', 'netbanking', 'wallet', 'gift'] },
    last4: String,
    cardBrand: String,
    autoRenew: { type: Boolean, default: true },
    upiId: String,
  },

  // Transaction
  transactionId: String,
  paymentGateway: String,
  gatewayTransactionId: String,

  // Benefits
  benefits: [{
    type: String,
    limit: Number,
    used: { type: Number, default: 0 },
  }],

  // Family
  family: {
    maxMembers: { type: Number, default: 1 },
    members: [{
      viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
      role: { type: String, enum: ['admin', 'member'] },
      addedAt: Date,
    }],
  },

  // Promo
  promo: {
    code: String,
    discount: { type: Number, default: 0 },
    freePeriod: { type: Number, default: 0 }, // days
  },

  // Cancellation
  cancellation: {
    reason: String,
    cancelledAt: Date,
    effectiveDate: Date,
    refundAmount: Number,
    feedback: String,
  },

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
subscriptionSchema.index({ viewerId: 1, status: 1 });
subscriptionSchema.index({ plan: 1, status: 1 });
subscriptionSchema.index({ 'endDate': 1, status: 1 });
subscriptionSchema.index({ 'nextBillingDate': 1 });
subscriptionSchema.index({ status: 1, startDate: -1 });

// Virtuals
subscriptionSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' && this.endDate > now;
});

subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return 0;
  const now = new Date();
  return Math.max(0, Math.ceil((this.endDate - now) / (1000 * 60 * 60 * 24)));
});

subscriptionSchema.virtual('isExpiringSoon').get(function() {
  return this.daysRemaining <= 7 && this.daysRemaining > 0;
});

// Methods
subscriptionSchema.methods.renew = async function(paymentDetails) {
  const duration = {
    monthly: 30,
    quarterly: 90,
    yearly: 365,
  };

  this.startDate = this.endDate;
  this.endDate = new Date(this.endDate.getTime() + duration[this.pricing.billingCycle] * 24 * 60 * 60 * 1000);
  this.nextBillingDate = this.endDate;
  this.status = 'active';

  if (paymentDetails) {
    this.payment = { ...this.payment, ...paymentDetails };
  }

  await this.save();
  return this;
};

subscriptionSchema.methods.cancel = async function(reason, immediate = false) {
  this.cancellation = {
    reason,
    cancelledAt: new Date(),
    effectiveDate: immediate ? new Date() : this.endDate,
  };

  this.status = 'cancelled';
  this.payment.autoRenew = false;

  await this.save();
  return this;
};

subscriptionSchema.methods.pause = async function(days) {
  const pauseEndDate = new Date();
  pauseEndDate.setDate(pauseEndDate.getDate() + days);

  // Extend subscription end date
  const additionalDays = Math.ceil((pauseEndDate - this.endDate) / (1000 * 60 * 60 * 24));
  this.endDate = new Date(this.endDate.getTime() + additionalDays * 24 * 60 * 60 * 1000);

  this.status = 'paused';
  await this.save();
  return this;
};

// Statics
subscriptionSchema.statics.findActiveByViewer = function(viewerId) {
  return this.findOne({ viewerId, status: 'active' });
};

subscriptionSchema.statics.findExpiringSoon = function(days = 7) {
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    status: 'active',
    'payment.autoRenew': true,
    endDate: { $lte: future },
  }).populate('viewerId', 'profile.email profile.phone');
};

subscriptionSchema.statics.getRevenue = function(startDate, endDate) {
  return this.aggregate([
    { $match: { status: 'active', startDate: { $gte: startDate, $lte: endDate } } },
    { $group: {
      _id: '$plan.type',
      total: { $sum: '$pricing.amount' },
      count: { $sum: 1 },
    }},
  ]);
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
