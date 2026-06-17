/**
 * Media OS - Production Model
 * Production projects and timelines
 */

const mongoose = require('mongoose');

const productionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['film', 'tv_show', 'web_series', 'documentary', 'music_video', 'ad_film', 'podcast'] },
  productionHouse: String,
  director: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
  producer: { type: mongoose.Schema.Types.ObjectId, ref: 'Crew' },
  genre: String,
  language: String,
  synopsis: String,
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    breakdown: mongoose.Schema.Types.Mixed,
  },
  timeline: {
    preProductionStart: Date,
    productionStart: Date,
    productionEnd: Date,
    postProductionEnd: Date,
    deliveryDate: Date,
  },
  status: {
    type: String,
    enum: ['planning', 'pre_production', 'production', 'post_production', 'review', 'completed', 'cancelled'],
    default: 'planning',
  },
  studio: { type: mongoose.Schema.Types.ObjectId, ref: 'Studio' },
  crew: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Crew' }],
  equipment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' }],
  locations: [String],
  schedule: [{
    date: Date,
    scenes: [String],
    location: String,
    crew: [String],
    notes: String,
  }],
  dailyReports: [{
    date: Date,
    scenesShot: [String],
    footageHours: Number,
    issues: [String],
    submittedBy: String,
  }],
  approvals: [{
    type: String,
    approvedBy: String,
    approvedAt: Date,
    notes: String,
  }],
  content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' }, // Final content reference
  twinId: String,
}, { timestamps: true });

productionSchema.index({ status: 1, timeline.productionStart: 1 });
productionSchema.index({ director: 1, status: 1 });

const Production = mongoose.model('Production', productionSchema);
module.exports = Production;
