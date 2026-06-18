/**
 * Marketing OS - Audience Model
 */

const mongoose = require('mongoose');

const audienceSchema = new mongoose.Schema({
  audienceId: { type: String, unique: true },
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['behavioral', 'demographic', 'firmographic', 'psychographic', 'technographic', 'combined'], required: true },
  organizationId: String,
  rules: {
    operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [{
      field: String,
      operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'between', 'in'] },
      value: mongoose.Schema.Types.Mixed,
      value2: mongoose.Schema.Types.Mixed,
    }],
  },
  isDynamic: { type: Boolean, default: true },
  members: [{ memberId: String, joinedAt: { type: Date, default: Date.now } }],
  size: { estimated: { type: Number, default: 0 }, actual: { type: Number, default: 0 }, lastCalculated: Date },
  integration: { source: { type: String, enum: ['manual', 'import', 'website', 'app', 'crm', 'ecommerce'] }, externalId: String },
  quality: { score: { type: Number, default: 100 }, engagement: { type: Number, default: 0 } },
  tags: [String],
  adBazaar: { segmentId: String, synced: { type: Boolean, default: false }, lastSync: Date },
  status: { type: String, enum: ['active', 'archived', 'syncing'], default: 'active' },
}, { timestamps: true });

audienceSchema.pre('save', function(next) {
  if (!this.audienceId) this.audienceId = `AUD-${Date.now().toString(36).toUpperCase()}`;
  next();
});

audienceSchema.methods.calculateSize = function() {
  this.size.actual = Math.floor(Math.random() * 10000);
  this.size.lastCalculated = new Date();
  return this.size;
};

audienceSchema.statics.findByOrg = function(orgId) {
  return this.find({ organizationId: orgId, status: 'active' });
};

const Audience = mongoose.model('Audience', audienceSchema);
module.exports = Audience;
