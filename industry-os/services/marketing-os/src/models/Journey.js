/**
 * Marketing OS - Journey Model
 */

const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
  journeyId: { type: String, unique: true },
  name: { type: String, required: true },
  title: String,
  description: String,
  type: { type: String, enum: ['onboarding', 'welcome', 'abandoned_cart', 'win_back', 'reengagement', 'upsell', 'cross_sell', 'loyalty', 'event', 'custom'], required: true },
  category: String,
  tags: [String],
  organizationId: String,
  trigger: {
    type: { type: String, enum: ['event', 'segment', 'manual', 'api', 'schedule', 'form', 'purchase', 'abandon'], required: true },
    event: String,
    segmentId: String,
  },
  steps: [{
    stepId: String,
    name: { type: String, required: true },
    type: { type: String, enum: ['email', 'sms', 'whatsapp', 'push', 'delay', 'condition', 'action', 'webhook', 'ai'], required: true },
    order: { type: Number, required: true },
    config: mongoose.Schema.Types.Mixed,
    timing: { sendTime: { type: String, enum: ['immediately', 'scheduled', 'optimal'] }, scheduledTime: String },
    status: { type: String, enum: ['active', 'paused', 'disabled'], default: 'active' },
  }],
  abTest: {
    enabled: { type: Boolean, default: false },
    variants: [{ name: String, percentage: { type: Number, default: 50 } }],
    winner: String,
  },
  goal: {
    type: { type: String, enum: ['conversion', 'engagement', 'retention', 'revenue', 'custom'] },
    metric: String,
    target: Number,
  },
  metrics: {
    totalEntered: { type: Number, default: 0 },
    currentlyActive: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    droppedOff: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed', 'archived'], default: 'draft' },
}, { timestamps: true });

journeySchema.pre('save', function(next) {
  if (!this.journeyId) this.journeyId = `JRN-${Date.now().toString(36).toUpperCase()}`;
  if (this.metrics.totalEntered > 0) {
    this.metrics.conversionRate = (this.metrics.conversions / this.metrics.totalEntered) * 100;
  }
  next();
});

journeySchema.methods.activate = function() { this.status = 'active'; return this; };
journeySchema.methods.pause = function() { this.status = 'paused'; return this; };
journeySchema.methods.recordEntry = function() { this.metrics.totalEntered += 1; this.metrics.currentlyActive += 1; return this; };
journeySchema.methods.recordConversion = function(revenue = 0) {
  this.metrics.conversions += 1;
  this.metrics.currentlyActive -= 1;
  this.metrics.completed += 1;
  this.metrics.revenue += revenue;
  if (this.metrics.totalEntered > 0) this.metrics.conversionRate = (this.metrics.conversions / this.metrics.totalEntered) * 100;
  return this;
};

journeySchema.methods.clone = function(newName) {
  const clone = new this.constructor({ ...this.toObject(), _id: undefined, journeyId: undefined, name: newName || `${this.name} (Copy)`, status: 'draft', metrics: { totalEntered: 0, currentlyActive: 0, completed: 0, droppedOff: 0, conversions: 0, conversionRate: 0, revenue: 0 } });
  return clone;
};

journeySchema.statics.getTemplates = function() {
  return [
    { type: 'welcome', name: 'Welcome Series', description: 'Onboard new customers' },
    { type: 'abandoned_cart', name: 'Abandoned Cart', description: 'Recover lost sales' },
    { type: 'win_back', name: 'Win Back', description: 'Re-engage inactive customers' },
    { type: 'reengagement', name: 'Re-engagement', description: 'Wake up dormant users' },
    { type: 'upsell', name: 'Upsell Campaign', description: 'Promote premium products' },
    { type: 'loyalty', name: 'Loyalty Rewards', description: 'Engage loyal customers' },
  ];
};

const Journey = mongoose.model('Journey', journeySchema);
module.exports = Journey;
