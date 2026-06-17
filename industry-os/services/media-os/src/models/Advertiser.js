/**
 * Media OS - Advertiser Model
 * Brand/advertiser profiles with billing and campaign tracking
 */

const mongoose = require('mongoose');

const advertiserSchema = new mongoose.Schema({
  // Company info
  name: { type: String, required: true },
  legalName: String,
  industry: { type: String, required: true },
  subIndustry: String,
  website: String,
  logo: String,
  description: String,

  // Contact
  contactPerson: String,
  email: { type: String, required: true },
  phone: String,
  address: {
    street: String,
    city: String,
    state: String,
    country: { type: String, default: 'India' },
    pincode: String,
  },

  // Billing
  billing: {
    gstin: String,
    pan: String,
    tan: String,
    billingName: String,
    billingEmail: String,
    billingAddress: String,
  },

  // Credit
  credit: {
    limit: { type: Number, default: 0 },
    outstanding: { type: Number, default: 0 },
    available: { type: Number, default: 0 }, // calculated
    paymentTerms: { type: Number, default: 30 }, // days
    creditRating: { type: String, enum: ['AAA', 'AA', 'A', 'B', 'C', 'NR'], default: 'NR' },
  },

  // Campaigns
  campaigns: [{
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    name: String,
    status: String,
    budget: Number,
    spent: Number,
  }],

  // Stats
  stats: {
    totalCampaigns: { type: Number, default: 0 },
    activeCampaigns: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalClicks: { type: Number, default: 0 },
    totalConversions: { type: Number, default: 0 },
    avgCTR: { type: Number, default: 0 },
    avgROAS: { type: Number, default: 0 },
  },

  // Payment history
  paymentHistory: [{
    invoiceId: String,
    amount: Number,
    status: String,
    paidAt: Date,
    dueDate: Date,
  }],

  // RTMN Twin ID
  twinId: { type: String, sparse: true, index: true },

  // Status
  status: {
    type: String,
    enum: ['prospect', 'active', 'inactive', 'suspended', 'blocked'],
    default: 'active',
  },

  // Verification
  verified: { type: Boolean, default: false },
  verifiedAt: Date,
  verificationDocuments: [String],

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtuals
advertiserSchema.virtual('creditAvailable').get(function() {
  return Math.max(0, this.credit.limit - this.credit.outstanding);
});

// Indexes
advertiserSchema.index({ name: 1 });
advertiserSchema.index({ industry: 1 });
advertiserSchema.index({ email: 1 }, { unique: true });
advertiserSchema.index({ status: 1 });
advertiserSchema.index({ 'stats.totalSpent': -1 });

// Methods
advertiserSchema.methods.checkCredit = function(amount) {
  return this.creditAvailable >= amount;
};

advertiserSchema.methods.reserveCredit = async function(amount) {
  if (!this.checkCredit(amount)) {
    throw new Error('Insufficient credit');
  }
  this.credit.outstanding += amount;
  await this.save();
};

advertiserSchema.methods.releaseCredit = async function(amount) {
  this.credit.outstanding = Math.max(0, this.credit.outstanding - amount);
  await this.save();
};

advertiserSchema.methods.addCampaignSpend = async function(amount) {
  const campaign = this.campaigns[this.campaigns.length - 1];
  if (campaign) {
    campaign.spent += amount;
  }
  this.stats.totalSpent += amount;
  await this.save();
};

// Statics
advertiserSchema.statics.findByIndustry = function(industry) {
  return this.find({ industry, status: 'active' });
};

advertiserSchema.statics.findTopSpenders = function(limit = 20) {
  return this.find({ status: 'active' })
    .sort({ 'stats.totalSpent': -1 })
    .limit(limit);
};

const Advertiser = mongoose.model('Advertiser', advertiserSchema);

module.exports = Advertiser;
