/**
 * Media OS - Royalty Model
 * Revenue sharing and royalty calculations
 */

const mongoose = require('mongoose');

const royaltyRateSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['flat', 'percentage', 'tiered', 'hybrid'],
    required: true,
  },
  rate: Number, // percentage or flat amount
  tiers: [{
    minRevenue: Number,
    maxRevenue: Number,
    rate: Number,
  }],
  minimumGuarantee: Number,
  recoupable: { type: Boolean, default: true },
}, { _id: false });

const royaltyPaymentSchema = new mongoose.Schema({
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  licenseId: { type: mongoose.Schema.Types.ObjectId, ref: 'License' },

  // Revenue breakdown
  revenue: {
    subscription: { type: Number, default: 0 },
    avod: { type: Number, default: 0 },
    svod: { type: Number, default: 0 },
    transactional: { type: Number, default: 0 },
    adRevenue: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },

  // Calculations
  calculations: {
    totalRevenue: Number,
    platformFees: { type: Number, default: 0 },
    netRevenue: Number,
    recoupmentApplied: { type: Number, default: 0 },
    taxableRevenue: Number,
    royaltyRate: Number,
    royaltyAmount: Number,
  },

  // Payment
  status: {
    type: String,
    enum: ['calculated', 'pending_approval', 'approved', 'paid', 'disputed', 'cancelled'],
    default: 'calculated',
  },

  // Approval
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  approvedAt: Date,

  // Payment details
  payment: {
    method: String,
    transactionId: String,
    paidAt: Date,
    reference: String,
  },

  // Dispute
  dispute: {
    raised: { type: Boolean, default: false },
    reason: String,
    raisedBy: String,
    raisedAt: Date,
    resolved: { type: Boolean, default: false },
    resolution: String,
    resolvedAt: Date,
  },

  // Breakdown by content
  contentBreakdown: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    title: String,
    views: Number,
    watchTime: Number,
    revenue: Number,
    royaltyAmount: Number,
  }],

}, { timestamps: true });

const royaltySchema = new mongoose.Schema({
  // Parties
  rightsHolder: {
    type: { type: String, enum: ['studio', 'producer', 'talent', 'music_label', 'distributor', 'aggregator'], required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    email: String,
    taxId: String,
    country: String,
  },

  // Agreement
  agreement: {
    agreementId: { type: String, unique: true },
    title: String,
    type: { type: String, enum: ['exclusive', 'non_exclusive', 'sublicense', 'work_for_hire'] },
    signedDate: Date,
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: false },
    renewalTerms: String,
  },

  // Royalty structure
  royalty: {
    // Subscription (SVOD)
    subscription: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['flat', 'percentage', 'tiered'] },
      rates: [{
        tier: Number,
        minSubscribers: Number,
        maxSubscribers: Number,
        rate: Number, // percentage
      }],
      minimumGuarantee: { type: Number, default: 0 },
    },

    // Ad-supported (AVOD)
    adSupported: {
      enabled: { type: Boolean, default: false },
      type: { type: String, enum: ['flat', 'percentage'] },
      rate: { type: Number, default: 0 }, // percentage of net ad revenue
      revenueShare: { type: Number, default: 0 }, // content share of total
    },

    // Transactional (TVOD)
    transactional: {
      enabled: { type: Boolean, default: false },
      purchase: {
        type: { type: String, enum: ['flat', 'percentage'] },
        rate: { type: Number, default: 0 },
      },
      rental: {
        duration: { type: Number, default: 48 }, // hours
        type: { type: String, enum: ['flat', 'percentage'] },
        rate: { type: Number, default: 0 },
      },
    },

    // Music/Soundtrack
    music: {
      enabled: { type: Boolean, default: false },
      syncFee: { type: Number, default: 0 },
      performanceRoyalty: { type: Number, default: 0 },
      mechanicalRoyalty: { type: Number, default: 0 },
    },

    // Other
    other: [{
      name: String,
      description: String,
      type: { type: String, enum: ['flat', 'percentage'] },
      rate: Number,
      enabled: { type: Boolean, default: true },
    }],
  },

  // Recoupment
  recoupment: {
    enabled: { type: Boolean, default: false },
    advanceAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }, // remaining to recoup
    recouped: { type: Number, default: 0 },
    recoupRate: { type: Number, default: 0 }, // percentage of revenue to recoup
  },

  // Content covered
  contentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
  musicTrackIds: [String],

  // Geographic scope
  territories: [{
    country: String,
    regions: [String],
    exclusivity: { type: Boolean, default: false },
  }],

  // Payment terms
  paymentTerms: {
    frequency: { type: String, enum: ['monthly', 'quarterly', 'semiannually', 'annually'], default: 'quarterly' },
    paymentDays: { type: Number, default: 30 }, // days after period end
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: ['wire', 'check', 'paypal', 'direct_deposit'] },
    bankDetails: mongoose.Schema.Types.Mixed,
  },

  // Compliance
  compliance: {
    auditRights: { type: Boolean, default: false },
    auditNotice: { type: Number, default: 30 }, // days notice required
    recordsRetention: { type: Number, default: 3 }, // years
    taxWithholding: { type: Number, default: 0 }, // percentage
    treatyRate: { type: Number, default: 0 },
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'active', 'expired', 'terminated', 'renewed'],
    default: 'draft',
  },

  // Documents
  documents: [{
    type: { type: String, enum: ['agreement', 'amendment', 'termination', 'renewal'] },
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    signed: { type: Boolean, default: false },
    signedAt: Date,
  }],

  // Payment history
  payments: [royaltyPaymentSchema],

  // RTMN Integration
  twinId: String,
  lawgensContractId: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate agreement ID
royaltySchema.pre('save', function(next) {
  if (!this.agreement.agreementId) {
    const prefix = {
      studio: 'STD',
      producer: 'PRD',
      talent: 'TAL',
      music_label: 'MUS',
      distributor: 'DST',
      aggregator: 'AGG',
    }[this.rightsHolder.type] || 'RGT';

    const timestamp = Date.now().toString(36).toUpperCase();
    this.agreement.agreementId = `${prefix}-${timestamp}`;
  }

  // Update recoupment balance
  if (this.recoupment?.enabled && this.recoupment.advanceAmount > 0) {
    this.recoupment.balance = this.recoupment.advanceAmount - this.recoupment.recouped;
  }

  next();
});

// Indexes
royaltySchema.index({ 'rightsHolder.entityId': 1 });
royaltySchema.index({ 'agreement.agreementId': 1 }, { unique: true });
royaltySchema.index({ 'agreement.startDate': 1, 'agreement.endDate': 1 });
royaltySchema.index({ status: 1 });
royaltySchema.index({ contentIds: 1 });

// Virtuals
royaltySchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         this.agreement.startDate <= now &&
         this.agreement.endDate >= now;
});

royaltySchema.virtual('daysRemaining').get(function() {
  if (!this.agreement.endDate) return 0;
  return Math.max(0, Math.ceil((this.agreement.endDate - new Date()) / (1000 * 60 * 60 * 24)));
});

royaltySchema.virtual('totalPaid').get(function() {
  return this.payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.calculations.royaltyAmount, 0);
});

// Methods
royaltySchema.methods.calculateRoyalty = async function(revenueData, contentId = null) {
  const { subscription, avod, svod, transactional, adRevenue } = revenueData;
  let totalRoyalty = 0;
  const breakdown = [];

  // Calculate subscription royalty
  if (this.royalty.subscription?.enabled && subscription > 0) {
    const subRoyalty = this.calculateSubscriptionRoyalty(subscription);
    totalRoyalty += subRoyalty;
    breakdown.push({ type: 'subscription', revenue: subscription, royalty: subRoyalty });
  }

  // Calculate AVOD royalty
  if (this.royalty.adSupported?.enabled && adRevenue > 0) {
    const avodRoyalty = adRevenue * (this.royalty.adSupported.rate / 100);
    totalRoyalty += avodRoyalty;
    breakdown.push({ type: 'adSupported', revenue: adRevenue, royalty: avodRoyalty });
  }

  // Calculate transactional royalty
  if (this.royalty.transactional?.enabled && transactional > 0) {
    const txnRoyalty = transactional * (this.royalty.transactional.purchase?.rate / 100);
    totalRoyalty += txnRoyalty;
    breakdown.push({ type: 'transactional', revenue: transactional, royalty: txnRoyalty });
  }

  // Apply recoupment
  if (this.recoupment?.enabled && this.recoupment.balance > 0) {
    const recoupAmount = Math.min(totalRoyalty * (this.recoupment.recoupRate / 100), this.recoupment.balance);
    totalRoyalty -= recoupAmount;
    this.recoupment.recouped += recoupAmount;
    this.recoupment.balance -= recoupAmount;
  }

  // Apply tax withholding
  if (this.compliance?.taxWithholding > 0) {
    totalRoyalty *= (1 - this.compliance.taxWithholding / 100);
  }

  return {
    totalRoyalty: Math.round(totalRoyalty * 100) / 100,
    breakdown,
    recoupApplied: this.recoupment?.recouped || 0,
    remainingRecoupment: this.recoupment?.balance || 0,
  };
};

royaltySchema.methods.calculateSubscriptionRoyalty = function(revenue) {
  const { type, rates, minimumGuarantee } = this.royalty.subscription;

  if (!rates || rates.length === 0) return 0;

  if (type === 'flat') {
    return rates[0]?.rate || 0;
  }

  if (type === 'percentage') {
    return revenue * ((rates[0]?.rate || 0) / 100);
  }

  if (type === 'tiered') {
    let royalty = 0;
    let remainingRevenue = revenue;

    // Sort tiers by minSubscribers
    const sortedRates = [...rates].sort((a, b) => a.minSubscribers - b.minSubscribers);

    for (const tier of sortedRates) {
      if (remainingRevenue <= 0) break;

      const tierRevenue = Math.min(remainingRevenue, tier.maxSubscribers - tier.minSubscribers);
      royalty += tierRevenue * (tier.rate / 100);
      remainingRevenue -= tierRevenue;
    }

    return royalty;
  }

  return 0;
};

royaltySchema.methods.generatePayment = async function(period) {
  const payment = new mongoose.model('RoyaltyPayment')({
    period,
    royaltyId: this._id,
    rightsHolder: this.rightsHolder,
  });

  // Calculate revenue for the period
  const revenue = await this.calculatePeriodRevenue(period);

  // Calculate royalty
  const royaltyCalc = await this.calculateRoyalty(revenue);

  payment.revenue = revenue;
  payment.calculations = {
    totalRevenue: revenue.total,
    platformFees: 0, // Would come from actual data
    netRevenue: revenue.total,
    royaltyRate: royaltyCalc.totalRoyalty / revenue.total * 100,
    royaltyAmount: royaltyCalc.totalRoyalty,
  };

  this.payments.push(payment);
  await this.save();

  return payment;
};

royaltySchema.methods.calculatePeriodRevenue = async function(period) {
  // This would aggregate actual revenue data from payment/subscription records
  // Placeholder implementation
  return {
    subscription: 0,
    avod: 0,
    svod: 0,
    transactional: 0,
    adRevenue: 0,
    total: 0,
  };
};

royaltySchema.methods.terminate = async function(reason) {
  this.status = 'terminated';
  this.terminationReason = reason;
  this.terminationDate = new Date();
  await this.save();
  return this;
};

royaltySchema.methods.renew = async function(newTerms) {
  // Create new agreement period
  this.agreement.startDate = this.agreement.endDate;
  this.agreement.endDate = new Date(this.agreement.endDate.getTime() + 365 * 24 * 60 * 60 * 1000);
  this.status = 'renewed';

  if (newTerms) {
    Object.assign(this.royalty, newTerms);
  }

  await this.save();
  return this;
};

// Statics
royaltySchema.statics.findActive = function() {
  return this.find({
    status: 'active',
    'agreement.endDate': { $gte: new Date() },
  });
};

royaltySchema.statics.findByRightsHolder = function(entityId) {
  return this.find({ 'rightsHolder.entityId': entityId }).sort('-agreement.startDate');
};

royaltySchema.statics.findExpiring = function(days = 90) {
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    status: 'active',
    'agreement.endDate': { $lte: future },
  });
};

royaltySchema.statics.findPendingPayments = function() {
  return this.find({
    'payments.status': 'pending_approval',
  });
};

const Royalty = mongoose.model('Royalty', royaltySchema);

module.exports = Royalty;
