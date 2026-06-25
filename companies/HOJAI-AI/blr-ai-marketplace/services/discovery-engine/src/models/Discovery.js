/**
 * Discovery Engine - MongoDB Models
 *
 * Provides persistent storage for indexed documents across
 * services, agents, twins, and intents.
 */

const mongoose = require('mongoose');

// Index schema for catalog items
const indexSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  kind: {
    type: String,
    enum: ['service', 'agent', 'twin', 'intent'],
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
    default: '',
  },
  tags: [{
    type: String,
    index: true,
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  // Search optimization fields
  nameTokens: [String],      // Tokenized name for search
  descriptionTokens: [String], // Tokenized description
  searchText: String,         // Combined searchable text
  // Stats
  rating: {
    type: Number,
    min: 0,
    max: 5,
  },
  installCount: {
    type: Number,
    default: 0,
  },
  viewCount: {
    type: Number,
    default: 0,
  },
  // Timestamps
  indexedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient search
indexSchema.index({ kind: 1, searchText: 'text' });
indexSchema.index({ kind: 1, rating: -1 });
indexSchema.index({ kind: 1, installCount: -1 });
indexSchema.index({ tags: 1 });
indexSchema.index({ searchText: 'text', name: 'text', description: 'text', tags: 'text' });

// Search history for analytics
const searchHistorySchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    index: true,
  },
  kind: {
    type: String,
    enum: ['service', 'agent', 'twin', 'intent', 'all'],
    default: 'all',
  },
  resultsCount: {
    type: Number,
    default: 0,
  },
  responseTime: {
    type: Number, // ms
    default: 0,
  },
  ip: String,
  userAgent: String,
}, {
  timestamps: true,
});

// Search history indexes
searchHistorySchema.index({ createdAt: -1 });
searchHistorySchema.index({ query: 'text' });

// Popular searches aggregation
const popularSearchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 1,
  },
  lastSearched: {
    type: Date,
    default: Date.now,
  },
  avgResults: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Auto-increment popular search count
popularSearchSchema.statics.recordSearch = async function(query, resultsCount) {
  const normalized = query.toLowerCase().trim();
  return this.findOneAndUpdate(
    { query: normalized },
    {
      $inc: { count: 1 },
      $set: { lastSearched: new Date() },
    },
    { upsert: true, new: true }
  );
};

// Create models
const Index = mongoose.model('DiscoveryIndex', indexSchema);
const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
const PopularSearch = mongoose.model('PopularSearch', popularSearchSchema);

module.exports = {
  Index,
  SearchHistory,
  PopularSearch,
};
