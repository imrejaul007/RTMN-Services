/**
 * Media OS - License Model
 * Content rights and licensing management
 */

const mongoose = require('mongoose');

const licenseSchema = new mongoose.Schema({
  // Content
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },

  // License holder
  licensor: {
    name: { type: String, required: true },
    company: String,
    type: { type: String, enum: ['studio', 'distributor', 'production_house', 'talent', 'music_label', 'aggregator'] },
    contactPerson: String,
    email: String,
    phone: String,
  },

  // License type
  type: {
    type: { type: String, enum: ['exclusive', 'non_exclusive', 'shared', 'sublicense'] },
    required: true,
  },

  // Scope
  scope: {
    territories: [{ type: String, required: true }], // ['India', 'Global', 'South Asia']
    regions: [String], // ['Mumbai', 'Delhi']
    languages: [{ type: String }], // ['Hindi', 'English']
    channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    platforms: [{ type: String, enum: ['theatrical', 'tv', 'ott', 'svod', 'avod', 'pvod', 'youtube', 'social'] }],
  },

  // Duration
  duration: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    durationDays: Number,
    autoRenew: { type: Boolean, default: false },
    renewTerms: String,
  },

  // Exclusivity
  exclusivity: {
    isExclusive: { type: Boolean, default: false },
    exclusivityPeriod: Number, // days
    competitors: [String], // blocked competitors
    conditions: String,
  },

  // Compensation
  compensation: {
    type: { type: String, enum: ['flat', 'royalty', 'minimum_guarantee', 'revenue_share', 'hybrid'] },
    minimumGuarantee: { type: Number, default: 0 },
    mgPaymentSchedule: [{
      date: Date,
      amount: Number,
      status: { type: String, enum: ['pending', 'paid'] },
    }],
    royaltyRate: { type: Number, default: 0 }, // percentage
    revenueShare: { type: Map, of: Number }, // { 'svod': 30, 'avod': 40 }
    platformFees: Number,
    deductions: [String],
  },

  // Obligations
  obligations: {
    minimumReleases: Number, // minimum content pieces
    exclusivityWindow: Number, // days before competitor release
    marketingCommitment: String,
    promotionalSupport: String,
  },

  // Content delivery
  delivered: {
    masterFiles: { type: Boolean, default: false },
    subtitles: { type: Boolean, default: false },
    dubbedVersions: [{ type: String }], // ['Tamil', 'Telugu']
    marketingAssets: { type: Boolean, default: false },
    deliveredAt: Date,
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_signature', 'active', 'expiring', 'expired', 'terminated', 'renewed'],
    default: 'draft',
  },

  // Document
  contract: {
    documentId: String,
    documentUrl: String,
    signedUrl: String,
    signedAt: Date,
  },

  // Audit
  history: [{
    action: String,
    date: Date,
    by: String,
    notes: String,
  }],

  // RTMN Integration
  twinId: String,
  lawgensContractId: String, // LawGens contract reference

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
licenseSchema.index({ contentId: 1, status: 1 });
licenseSchema.index({ 'duration.endDate': 1, status: 1 });
licenseSchema.index({ 'licensor.name': 1 });
licenseSchema.index({ 'scope.territories': 1 });
licenseSchema.index({ status: 1, 'duration.endDate': -1 });

// Virtuals
licenseSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         this.duration.startDate <= now &&
         this.duration.endDate >= now;
});

licenseSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  return Math.max(0, Math.ceil((this.duration.endDate - now) / (1000 * 60 * 60 * 24)));
});

licenseSchema.virtual('isExpiringSoon').get(function() {
  return this.daysRemaining <= 30 && this.daysRemaining > 0;
});

// Methods
licenseSchema.methods.checkExpiry = async function() {
  if (this.status === 'expired') return this;

  const now = new Date();

  if (this.duration.endDate < now) {
    this.status = 'expired';
    await this.save();
    return this;
  }

  if (this.daysRemaining <= 30) {
    this.status = 'expiring';
    await this.save();
  }

  return this;
};

licenseSchema.methods.calculateRoyalty = async function(revenue, platform) {
  if (this.compensation.type === 'flat') {
    return 0;
  }

  if (this.compensation.type === 'royalty') {
    return revenue * (this.compensation.royaltyRate / 100);
  }

  if (this.compensation.type === 'revenue_share') {
    const platformShare = this.compensation.revenueShare?.get(platform) || 0;
    return revenue * (platformShare / 100);
  }

  return 0;
};

licenseSchema.methods.terminate = async function(reason) {
  this.status = 'terminated';
  this.history.push({
    action: 'terminated',
    date: new Date(),
    by: 'system',
    notes: reason,
  });
  await this.save();
  return this;
};

// Statics
licenseSchema.statics.findExpiring = function(days = 30) {
  const future = new Date();
  future.setDate(future.getDate() + days);

  return this.find({
    status: 'active',
    'duration.endDate': { $lte: future },
  }).populate('contentId', 'title type thumbnail');
};

licenseSchema.statics.findByTerritory = function(territory) {
  return this.find({
    'scope.territories': territory,
    status: 'active',
  });
};

licenseSchema.statics.checkAvailability = async function(contentId, territory, platform, date) {
  const licenses = await this.find({
    contentId,
    status: { $in: ['active', 'expiring'] },
    'duration.startDate': { $lte: date },
    'duration.endDate': { $gte: date },
  });

  for (const license of licenses) {
    // Check territory
    if (!license.scope.territories.includes('Global') &&
        !license.scope.territories.includes(territory)) {
      continue;
    }

    // Check platform
    if (!license.scope.platforms.includes(platform)) {
      continue;
    }

    // Check exclusivity
    if (license.exclusivity.isExclusive) {
      return {
        available: false,
        reason: 'Exclusive license held',
        licenseId: license._id,
        licensor: license.licensor.name,
      };
    }
  }

  return { available: true };
};

const License = mongoose.model('License', licenseSchema);

module.exports = License;
