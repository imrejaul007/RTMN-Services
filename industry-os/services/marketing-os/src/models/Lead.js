/**
 * Marketing OS - Lead Model
 */

const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phone: String,
  firstName: { type: String, required: true },
  lastName: String,
  fullName: String,
  company: String,
  jobTitle: String,
  industry: String,
  organizationId: String,
  source: {
    type: { type: String, enum: ['organic', 'paid', 'referral', 'social', 'email', 'event', 'webinar', 'organic_search', 'direct', 'other'], required: true },
    campaign: String,
    campaignId: String,
    medium: String,
    content: String,
  },
  status: { type: String, enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'], default: 'new' },
  score: { type: Number, default: 0, min: 0, max: 100 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D', 'F'] },
  qualification: {
    budget: { type: String, enum: ['hot', 'warm', 'cold'] },
    authority: { type: String, enum: ['decision_maker', 'influencer', 'user'] },
    need: { type: String, enum: ['high', 'medium', 'low'] },
    timeline: { type: String, enum: ['immediate', '1_3_months', '3_6_months', '6_plus_months'] },
  },
  owner: { userId: String, name: String, assignedAt: Date },
  demographics: { location: String, city: String, state: String, country: String },
  behavior: {
    totalVisits: { type: Number, default: 0 },
    pagesPerVisit: { type: Number, default: 0 },
    avgSessionDuration: { type: Number, default: 0 },
    lastVisit: Date,
    emailsOpened: { type: Number, default: 0 },
    emailsClicked: { type: Number, default: 0 },
  },
  tags: [String],
  notes: [{ text: String, userId: String, userName: String, createdAt: { type: Date, default: Date.now } }],
  deals: [{ dealId: String, name: String, value: Number, stage: String, probability: Number, expectedClose: Date }],
  lifecycle: { createdAt: Date, firstContactAt: Date, lastActivityAt: Date, qualifiedAt: Date, convertedAt: Date },
  consent: { email: { type: Boolean, default: false }, sms: { type: Boolean, default: false }, marketing: { type: Boolean, default: false } },
}, { timestamps: true });

leadSchema.pre('save', function(next) {
  if (!this.leadId) this.leadId = `LEAD-${Date.now().toString(36).toUpperCase()}`;
  this.fullName = `${this.firstName}${this.lastName ? ' ' + this.lastName : ''}`;
  if (!this.lifecycle.createdAt) this.lifecycle.createdAt = new Date();
  this.lifecycle.lastActivityAt = new Date();
  next();
});

leadSchema.methods.addNote = function(text, userId, userName) {
  this.notes.push({ text, userId, userName, createdAt: new Date() });
  this.lifecycle.lastActivityAt = new Date();
  return this;
};

leadSchema.methods.updateScore = function(delta, reason) {
  this.score = Math.max(0, Math.min(100, this.score + delta));
  return this;
};

leadSchema.methods.qualify = function(qualification) {
  this.qualification = qualification;
  this.status = 'qualified';
  this.lifecycle.qualifiedAt = new Date();
  return this;
};

leadSchema.methods.convert = function(dealData) {
  this.status = 'won';
  this.lifecycle.convertedAt = new Date();
  if (dealData) this.deals.push({ ...dealData, stage: 'new' });
  return this;
};

leadSchema.methods.lose = function(reason) {
  this.status = 'lost';
  this.lifecycle.lostAt = new Date();
  return this;
};

leadSchema.methods.assignTo = function(userId, userName) {
  this.owner = { userId, name: userName, assignedAt: new Date() };
  return this;
};

leadSchema.statics.findByScore = function(orgId, minScore) {
  return this.find({ organizationId: orgId, score: { $gte: minScore } }).sort('-score');
};

leadSchema.statics.getStats = async function(orgId) {
  return this.aggregate([
    { $match: { organizationId: orgId } },
    { $group: { _id: '$status', count: { $sum: 1 }, avgScore: { $avg: '$score' } } },
  ]);
};

const Lead = mongoose.model('Lead', leadSchema);
module.exports = Lead;
