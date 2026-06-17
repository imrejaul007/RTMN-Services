/**
 * Media OS - Brand Deal Model
 * Influencer brand partnership pipeline
 */

const mongoose = require('mongoose');

const dealMilestoneSchema = new mongoose.Schema({
  name: String,
  description: String,
  type: { type: String, enum: ['deliverable', 'payment', 'review'] },
  dueDate: Date,
  completedDate: Date,
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'approved', 'rejected'] },
  deliverables: [{
    name: String,
    url: String,
    submittedAt: Date,
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    approvedAt: Date,
  }],
});

const brandDealSchema = new mongoose.Schema({
  // Deal ID
  dealId: { type: String, unique: true },

  // Brand info
  brand: {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    industry: String,
    website: String,
    logo: String,
    contactPerson: String,
    email: String,
    phone: String,
  },

  // Creator info
  creator: {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true },
    handle: String,
    name: String,
    email: String,
    avatar: String,
  },

  // Campaign details
  campaign: {
    name: { type: String, required: true },
    description: String,
    brief: String,
    objectives: [String],
    keyMessages: [String],
    hashtags: [String],
    dos: [String],
    donts: [String],
  },

  // Content requirements
  content: {
    platforms: [{
      platform: { type: String, enum: ['media_os', 'instagram', 'youtube', 'twitter', 'tiktok', 'facebook', 'linkedin'] },
      contentType: { type: String, enum: ['story', 'post', 'reel', 'video', 'article', 'live'] },
      quantity: { type: Number, default: 1 },
      delivered: { type: Number, default: 0 },
      specifications: {
        duration: Number,
        minLength: Number,
        maxLength: Number,
        format: String,
        mustInclude: [String],
      },
    }],
    contentBrief: String,
    creativeFreedom: { type: String, enum: ['none', 'minimal', 'moderate', 'full'] },
    approvalRequired: { type: Boolean, default: true },
    approvalDeadline: Date,
  },

  // Timeline
  timeline: {
    campaignStart: Date,
    campaignEnd: Date,
    contentStart: Date,
    contentEnd: Date,
    postingWindow: {
      start: Date,
      end: Date,
    },
  },

  // Compensation
  compensation: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    breakdown: [{
      item: String,
      amount: Number,
    }],
    type: { type: String, enum: ['fixed', 'variable', 'hybrid'] },
    baseAmount: Number,
    performanceBonus: {
      enabled: { type: Boolean, default: false },
      metrics: [{
        name: String,
        target: Number,
        bonus: Number,
      }],
    },
    nonMonetary: [{
      name: String,
      value: Number,
    }],
  },

  // Deliverables
  deliverables: [dealMilestoneSchema],

  // Content submissions
  submissions: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    platform: String,
    submittedAt: Date,
    status: { type: String, enum: ['draft', 'submitted', 'revision_requested', 'approved', 'published'] },
    reviewNotes: String,
    performance: {
      views: Number,
      likes: Number,
      comments: Number,
      shares: Number,
      engagement: Number,
    },
  }],

  // Performance tracking
  performance: {
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    engagementRate: Number,
    averageViews: Number,
    roi: Number,
  },

  // Payment
  payment: {
    totalAmount: Number,
    installments: [{
      amount: Number,
      percentage: Number,
      trigger: { type: String, enum: ['signing', 'first_deliverable', 'midpoint', 'completion', 'performance'] },
      dueDate: Date,
      paidDate: Date,
      status: { type: String, enum: ['pending', 'invoiced', 'paid', 'overdue'] },
      invoiceId: String,
    }],
    paidAmount: { type: Number, default: 0 },
    pendingAmount: Number,
    currency: { type: String, default: 'INR' },
  },

  // Contract
  contract: {
    documentUrl: String,
    signedUrl: String,
    signedBy: String,
    signedAt: Date,
    terms: String,
  },

  // Legal
  legal: {
    exclusivity: {
      required: { type: Boolean, default: false },
      competitors: [String],
      duration: Number,
      geographic: [String],
    },
    usageRights: {
      duration: Number,
      platforms: [String],
      territories: [String],
      commercialUse: { type: Boolean, default: false },
    },
    disclosure: { type: String, enum: ['sponsored', 'ad', 'partner', 'none'] },
  },

  // Status
  status: {
    type: String,
    enum: ['inquiry', 'negotiating', 'brief_sent', 'contract_pending', 'active', 'content_phase', 'completed', 'cancelled', 'renewed'],
    default: 'inquiry',
  },

  // Negotiation
  negotiation: [{
    from: { type: String, enum: ['brand', 'creator'] },
    offer: Number,
    counterOffer: Number,
    notes: String,
    respondedAt: Date,
  }],

  // RTMN Integration
  adbazaarCampaignId: String,

}, { timestamps: true });

// Generate deal ID
brandDealSchema.pre('save', function(next) {
  if (!this.dealId) {
    const prefix = 'BD';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.dealId = `${prefix}-${timestamp}-${random}`;
  }

  if (this.payment?.totalAmount) {
    this.payment.pendingAmount = this.payment.totalAmount - (this.payment.paidAmount || 0);
  }

  next();
});

// Indexes
brandDealSchema.index({ 'creator.creatorId': 1 });
brandDealSchema.index({ 'brand.companyId': 1 });
brandDealSchema.index({ status: 1 });
brandDealSchema.index({ dealId: 1 }, { unique: true });
brandDealSchema.index({ 'timeline.campaignEnd': 1 });

// Virtuals
brandDealSchema.virtual('isActive').get(function() {
  return ['active', 'content_phase'].includes(this.status);
});

brandDealSchema.virtual('progress').get(function() {
  const total = this.content.platforms.reduce((sum, p) => sum + p.quantity, 0);
  const delivered = this.content.platforms.reduce((sum, p) => sum + p.delivered, 0);
  return total > 0 ? (delivered / total) * 100 : 0;
});

brandDealSchema.virtual('daysRemaining').get(function() {
  if (!this.timeline.campaignEnd) return 0;
  return Math.max(0, Math.ceil((this.timeline.campaignEnd - new Date()) / (1000 * 60 * 60 * 24)));
});

// Methods
brandDealSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  return this;
};

brandDealSchema.methods.submitContent = function(contentId, platform) {
  this.submissions.push({
    contentId,
    platform,
    submittedAt: new Date(),
    status: 'submitted',
  });

  const platformReq = this.content.platforms.find(p => p.platform === platform);
  if (platformReq) {
    platformReq.delivered += 1;
  }

  return this;
};

brandDealSchema.methods.approveSubmission = function(contentId) {
  const submission = this.submissions.find(s => s.contentId.toString() === contentId.toString());
  if (submission) {
    submission.status = 'approved';
  }
  return this;
};

brandDealSchema.methods.recordPerformance = function(contentId, metrics) {
  const submission = this.submissions.find(s => s.contentId.toString() === contentId.toString());
  if (submission) {
    Object.assign(submission.performance, metrics);
  }

  this.performance.totalReach = this.submissions.reduce((sum, s) => sum + (s.performance?.views || 0), 0);
  this.performance.totalEngagement = this.submissions.reduce((sum, s) => {
    return sum + (s.performance?.likes || 0) + (s.performance?.comments || 0) + (s.performance?.shares || 0);
  }, 0);

  if (this.performance.totalImpressions > 0) {
    this.performance.engagementRate = (this.performance.totalEngagement / this.performance.totalImpressions) * 100;
  }

  if (this.performance.totalViews > 0 && this.compensation.total > 0) {
    this.performance.roi = (this.performance.totalEngagement / this.compensation.total) * 100;
  }

  return this;
};

brandDealSchema.methods.processPayment = async function(installmentIndex) {
  const installment = this.payment.installments[installmentIndex];
  if (!installment) return null;

  installment.status = 'paid';
  installment.paidDate = new Date();
  this.payment.paidAmount += installment.amount;
  this.payment.pendingAmount = this.payment.totalAmount - this.payment.paidAmount;

  await this.save();
  return installment;
};

brandDealSchema.methods.addNegotiation = function(from, offer, notes) {
  this.negotiation.push({
    from,
    offer,
    notes,
    respondedAt: new Date(),
  });
  return this;
};

// Statics
brandDealSchema.statics.findByCreator = function(creatorId) {
  return this.find({ 'creator.creatorId': creatorId }).sort('-createdAt');
};

brandDealSchema.statics.findActiveByCreator = function(creatorId) {
  return this.find({
    'creator.creatorId': creatorId,
    status: { $in: ['active', 'content_phase'] },
  });
};

brandDealSchema.statics.findPendingApproval = function(creatorId) {
  return this.find({
    'creator.creatorId': creatorId,
    'submissions.status': 'submitted',
  });
};

brandDealSchema.statics.findExpiring = function(days = 30) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  return this.find({
    status: 'active',
    'timeline.campaignEnd': { $lte: future },
  });
};

const BrandDeal = mongoose.model('BrandDeal', brandDealSchema);

module.exports = BrandDeal;
