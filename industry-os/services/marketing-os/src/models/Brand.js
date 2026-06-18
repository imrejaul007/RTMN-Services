/**
 * Marketing OS - Brand Model
 */

const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: String,
  tagline: String,
  description: String,
  industry: String,
  organizationId: String,
  colors: [{
    name: String,
    hex: String,
    usage: [String],
  }],
  typography: [{
    name: String,
    family: String,
    weights: [String],
    usage: String,
  }],
  guidelines: {
    voice: String,
    tone: [String],
    messaging: String,
    dos: [String],
    donts: [String],
  },
  health: {
    score: { type: Number, default: 100 },
    sentiment: { positive: { type: Number, default: 0 }, negative: { type: Number, default: 0 }, neutral: { type: Number, default: 0 } },
    lastUpdated: Date,
  },
  status: { type: String, enum: ['active', 'archived', 'draft'], default: 'active' },
}, { timestamps: true });

brandSchema.methods.calculateHealth = function() {
  const { positive, negative, neutral } = this.health?.sentiment || {};
  const total = positive + negative + neutral;
  if (total === 0) { this.health.score = 100; return 100; }
  const sentimentScore = ((positive - negative) / total) * 100;
  this.health.score = Math.round((sentimentScore + 50) / 2);
  this.health.lastUpdated = new Date();
  return this.health.score;
};

brandSchema.statics.findByOrg = function(orgId) {
  return this.find({ organizationId: orgId, status: 'active' });
};

const Brand = mongoose.model('Brand', brandSchema);
module.exports = Brand;
