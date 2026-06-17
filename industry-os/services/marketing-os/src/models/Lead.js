/**
 * Marketing OS - Lead Model
 * Lead capture and management
 */

const mongoose = require('mongoose');

const leadActivitySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['email_sent', 'email_opened', 'email_clicked', 'page_visited', 'form_submitted', 'call', 'meeting', 'note', 'score_change', 'status_change'],
    required: true,
  },
  description: String,
  metadata: mongoose.Schema.Types.Mixed,
  userId: String,
  timestamp: { type: Date, default: Date.now },
});

const leadSchema = new mongoose.Schema({
  // Lead ID
  leadId: { type: String, unique: true },

  // Contact Info
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: String,
  firstName: { type: String, required: true, trim: true },
  lastName: String,
  fullName: String,

  // Company
  company: String,
  jobTitle: String,
  industry: String,
  companySize: String,
  annualRevenue: String,

  // Organization
  organizationId: String,

  // Source & Attribution
  source: {
    type: {
      type: String,
      enum: ['organic', 'paid', 'referral', 'social', 'email', 'event', 'webinar', 'organic_search', 'direct', 'other'],
      required: true,
    },
    campaign: String,
    campaignId: String,
    medium: String,
    content: String,
    term: String,
    firstTouchChannel: String,
    lastTouchChannel: String,
  },

  // Qualification
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
    default: 'new',
  },
  score: { type: Number, default: 0, min: 0, max: 100 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },

  // Qualification Criteria
  qualification: {
    budget: { type: String, enum: ['hot', 'warm', 'cold'] },
    authority: { type: String, enum: ['decision_maker', 'influencer', 'user'] },
    need: { type: String, enum: ['high', 'medium', 'low'] },
    timeline: { type: String, enum: ['immediate', '1_3_months', '3_6_months', '6_plus_months'] },
  },

  // Owner
  owner: {
    userId: String,
    name: String,
    assignedAt: Date,
  },

  // Demographics
  demographics: {
    location: String,
    city: String,
    state: String,
    country: String,
    timezone: String,
    language: String,
  },

  // Behavior
  behavior: {
    totalVisits: { type: Number, default: 0 },
    pagesPerVisit: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    lastVisit: Date,
    firstVisit: Date,
    emailsOpened: { type: Number, default: 0 },
    emailsClicked: { type: Number, default: 0 },
    formsSubmitted: { type: Number, default: 0 },
  },

  // Tags & Custom Fields
  tags: [String],
  customFields: mongoose.Schema.Types.Mixed,

  // Activities
  activities: [leadActivitySchema],

  // Notes
  notes: [{
    text: String,
    userId: String,
    userName: String,
    createdAt: { type: Date, default: Date.now },
  }],

  // Deals
  deals: [{
    dealId: String,
    name: String,
    value: Number,
    stage: String,
    probability: Number,
    expectedClose: Date,
  }],

  // Lifecycle
  lifecycle: {
    createdAt: Date,
    firstContactAt: Date,
    lastActivityAt: Date,
    qualifiedAt: Date,
    convertedAt: Date,
    lostAt: Date,
  },

  // Consent
  consent: {
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    marketing: { type: Boolean, default: false },
    gdpr: { type: Boolean, default: false },
    lastUpdated: Date,
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'converted', 'lost', 'junk'],
    default: 'active',
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Generate lead ID
leadSchema.pre('save', function(next) {
  if (!this.leadId) {
    const prefix = 'LEAD';
    const timestamp = Date.now().toString(36).toUpperCase();
    this.leadId = `${prefix}-${timestamp}`;
  }

  this.fullName = `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;

  if (this.lifecycle.createdAt) {
    this.lifecycle.lastActivityAt = new Date();
  } else {
    this.lifecycle.createdAt = new Date();
  }

  next();
});

// Indexes
leadSchema.index({ leadId: 1 }, { unique: true });
leadSchema.index({ email: 1 });
leadSchema.index({ organizationId: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ score: -1 });
leadSchema.index({ 'source.campaignId': 1 });
leadSchema.index({ 'owner.userId': 1 });
leadSchema.index({ tags: 1 });
leadSchema.index({ createdAt: -1 });

// Virtuals
leadSchema.virtual('value').get(function() {
  return this.deals?.reduce((sum, d) => sum + (d.value || 0), 0);
});

leadSchema.virtual('daysInStage').get(function() {
  const lastActivity = this.lifecycle.lastActivityAt || this.createdAt;
  return Math.floor((Date.now() - lastActivity) / (1000 * 60 * 60 * 24));
});

// Methods
leadSchema.methods.addActivity = function(type, description, metadata = {}, userId) {
  this.activities.push({
    type,
    description,
    metadata,
    userId,
    timestamp: new Date(),
  });
  this.lifecycle.lastActivityAt = new Date();
  return this;
};

leadSchema.methods.updateScore = function(delta, reason) {
  this.score = Math.max(0, Math.min(100, this.score + delta));
  this.addActivity('score_change', `Score ${delta > 0 ? 'increased' : 'decreased'} by ${Math.abs(delta)}. Reason: ${reason}`, { delta, newScore: this.score });
  return this;
};

leadSchema.methods.qualify = function(qualification) {
  this.qualification = qualification;
  this.status = 'qualified';
  this.lifecycle.qualifiedAt = new Date();
  this.addActivity('status_change', 'Lead qualified');
  return this;
};

leadSchema.methods.convert = function(dealData) {
  this.status = 'converted';
  this.lifecycle.convertedAt = new Date();
  if (dealData) {
    this.deals.push({
      ...dealData,
      stage: 'new',
    });
  }
  this.addActivity('status_change', 'Lead converted to customer');
  return this;
};

leadSchema.methods.lose = function(reason) {
  this.status = 'lost';
  this.lifecycle.lostAt = new Date();
  this.addActivity('status_change', `Lead lost: ${reason}`);
  return this;
};

leadSchema.methods.assignTo = function(userId, userName) {
  this.owner = {
    userId,
    name: userName,
    assignedAt: new Date(),
  };
  this.addActivity('status_change', `Assigned to ${userName}`);
  return this;
};

leadSchema.methods.addNote = function(text, userId, userName) {
  this.notes.push({
    text,
    userId,
    userName,
    createdAt: new Date(),
  });
  this.addActivity('note', `Note added: ${text.substring(0, 50)}...`);
  return this;
};

leadSchema.methods.trackPageVisit = function(page, duration) {
  this.behavior.totalVisits += 1;
  this.behavior.lastVisit = new Date();
  if (duration) {
    this.behavior.avgSessionDuration = (
      (this.behavior.avgSessionDuration * (this.behavior.totalVisits - 1) + duration) /
      this.behavior.totalVisits
    );
  }
  this.updateScore(5, 'Page visit');
  return this;
};

// Statics
leadSchema.statics.findByScore = function(orgId, minScore) {
  return this.find({ organizationId: orgId, score: { $gte: minScore }, status: 'active' })
    .sort('-score');
};

leadSchema.statics.findByStatus = function(orgId, status) {
  return this.find({ organizationId: orgId, status });
};

leadSchema.statics.getStats = async function(orgId) {
  return this.aggregate([
    { $match: { organizationId: orgId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgScore: { $avg: '$score' },
        totalValue: { $sum: '$value' },
      },
    },
  ]);
};

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;
