/**
 * Media OS - Sponsorship Model
 * Branded content and sponsorship deals
 */

const mongoose = require('mongoose');

const sponsorBenefitSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['impressions', 'views', 'mentions', 'integrations', 'events', 'social', 'other'] },
  quantity: Number,
  delivered: { type: Number, default: 0 },
  unit: String,
  value: Number,
}, { _id: true });

const sponsorshipSchema = new mongoose.Schema({
  // Sponsor info
  sponsor: {
    companyId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    industry: String,
    contactPerson: String,
    email: String,
    logo: String,
  },

  // Deal info
  deal: {
    title: { type: String, required: true },
    description: String,
    type: {
      type: String,
      enum: ['presenting', 'title', 'associate', 'powered_by', 'co_sponsor', 'exclusive', 'product_placement', 'integration'],
      required: true,
    },
    exclusivity: {
      required: { type: Boolean, default: false },
      competitors: [String],
      duration: Number, // days
    },
  },

  // Association
  association: {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    program: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    series: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    season: String,
  },

  // Value
  value: {
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    breakdown: [{
      item: String,
      value: Number,
    }],
    paymentTerms: {
      upfront: { type: Boolean, default: false },
      installments: { type: Number, default: 1 },
      onDelivery: { type: Boolean, default: false },
    },
  },

  // Benefits
  benefits: [sponsorBenefitSchema],

  // Deliverables
  deliverables: [{
    name: String,
    description: String,
    type: { type: String, enum: ['logo', 'mention', 'integration', 'product', 'branded_content', 'social', 'event'] },
    format: String,
    quantity: Number,
    delivered: { type: Number, default: 0 },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in_progress', 'delivered', 'approved', 'rejected'] },
    notes: String,
  }],

  // Content
  content: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    type: { type: String, enum: ['logo', 'mention', 'integration', 'product_placement'] },
    appearsIn: String,
    delivered: { type: Boolean, default: false },
    approved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
    approvedAt: Date,
  }],

  // Schedule
  schedule: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: false },
  },

  // Payments
  payments: [{
    amount: Number,
    dueDate: Date,
    paidDate: Date,
    status: { type: String, enum: ['pending', 'invoiced', 'paid', 'overdue'] },
    invoiceId: String,
  }],

  // Performance
  performance: {
    impressions: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    engagement: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    brandSentiment: { type: Number, default: 0.5 },
    roi: { type: Number, default: 0 },
  },

  // Status
  status: {
    type: String,
    enum: ['negotiating', 'contract_sent', 'contract_signed', 'active', 'completed', 'cancelled', 'renewed'],
    default: 'negotiating',
  },

  // Contract
  contract: {
    documentId: String,
    documentUrl: String,
    signedUrl: String,
    signedAt: Date,
    terms: String,
  },

  // Approval
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer' },
  approvedAt: Date,

}, { timestamps: true });

// Indexes
sponsorshipSchema.index({ 'sponsor.companyId': 1 });
sponsorshipSchema.index({ status: 1 });
sponsorshipSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
sponsorshipSchema.index({ 'association.channel': 1 });
sponsorshipSchema.index({ 'association.program': 1 });

// Virtuals
sponsorshipSchema.virtual('totalValue').get(function() {
  return this.value.total;
});

sponsorshipSchema.virtual('totalDelivered').get(function() {
  return this.content.filter(c => c.delivered && c.approved).length;
});

sponsorshipSchema.virtual('isActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
         this.schedule.startDate <= now &&
         this.schedule.endDate >= now;
});

// Methods
sponsorshipSchema.methods.activate = function() {
  this.schedule.active = true;
  this.status = 'active';
  return this;
};

sponsorshipSchema.methods.deactivate = function() {
  this.schedule.active = false;
  this.status = 'completed';
  return this;
};

sponsorshipSchema.methods.approveContent = function(contentId, userId) {
  const item = this.content.find(c => c.contentId.toString() === contentId.toString());
  if (item) {
    item.approved = true;
    item.approvedBy = userId;
    item.approvedAt = new Date();
  }
  return this;
};

sponsorshipSchema.methods.recordDelivery = function(deliverableId) {
  const deliverable = this.deliverables.id(deliverableId);
  if (deliverable) {
    deliverable.delivered += 1;
    deliverable.status = 'delivered';
  }
  return this;
};

sponsorshipSchema.methods.updatePerformance = function(data) {
  Object.assign(this.performance, data);
  if (this.performance.impressions > 0 && this.value.total > 0) {
    this.performance.roi = (this.performance.views * 0.01) / this.value.total * 100;
  }
  return this;
};

// Statics
sponsorshipSchema.statics.findActive = function() {
  return this.find({ status: 'active', 'schedule.active': true });
};

sponsorshipSchema.statics.findByChannel = function(channelId) {
  return this.find({ 'association.channel': channelId }).sort('-createdAt');
};

sponsorshipSchema.statics.findExpiring = function(days = 30) {
  const future = new Date();
  future.setDate(future.getDate() + days);
  return this.find({
    status: 'active',
    'schedule.endDate': { $lte: future },
  });
};

const Sponsorship = mongoose.model('Sponsorship', sponsorshipSchema);

module.exports = Sponsorship;
