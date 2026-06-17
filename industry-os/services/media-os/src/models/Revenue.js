/**
 * Media OS - Revenue Model
 * Revenue tracking and analytics
 */

const mongoose = require('mongoose');

const revenueEntrySchema = new mongoose.Schema({
  // Date
  date: { type: Date, required: true },

  // Source
  source: {
    type: { type: String, enum: ['subscription', 'transactional', 'advertising', 'sponsorship', 'ppv', 'merchandise', 'affiliate', 'licensing', 'other'], required: true },
    category: String,
    subCategory: String,
  },

  // Revenue details
  revenue: {
    gross: { type: Number, required: true },
    discounts: { type: Number, default: 0 },
    refunds: { type: Number, default: 0 },
    net: Number,
  },

  // Cost details
  costs: {
    hosting: { type: Number, default: 0 },
    cdn: { type: Number, default: 0 },
    encoding: { type: Number, default: 0 },
    royalties: { type: Number, default: 0 },
    marketing: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },

  // Profit
  profit: Number,

  // Metrics
  metrics: {
    subscribers: { type: Number, default: 0 },
    newSubscribers: { type: Number, default: 0 },
    churnedSubscribers: { type: Number, default: 0 },
    activeViewers: { type: Number, default: 0 },
    contentViews: { type: Number, default: 0 },
    watchHours: { type: Number, default: 0 },
    adImpressions: { type: Number, default: 0 },
    adClicks: { type: Number, default: 0 },
    transactions: { type: Number, default: 0 },
  },

  // Attribution
  attribution: {
    channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    campaignId: String,
  },

  // Geographic
  geography: {
    country: String,
    region: String,
    city: String,
  },

  // Device
  device: {
    type: { type: String, enum: ['web', 'mobile', 'tablet', 'tv', 'other'] },
    os: String,
    platform: String,
  },

}, { timestamps: true });

// Calculate net and profit before saving
revenueEntrySchema.pre('save', function(next) {
  this.revenue.net = this.revenue.gross - this.revenue.discounts - this.revenue.refunds;
  this.costs.total = Object.values(this.costs).reduce((a, b) => (typeof b === 'number' ? a + b : a), 0);
  this.profit = this.revenue.net - this.costs.total;
  next();
});

// Indexes
revenueEntrySchema.index({ date: -1 });
revenueEntrySchema.index({ 'source.type': 1, date: -1 });
revenueEntrySchema.index({ 'attribution.content': 1 });
revenueEntrySchema.index({ 'attribution.channel': 1 });
revenueEntrySchema.index({ 'attribution.campaign': 1 });
revenueEntrySchema.index({ 'geography.country': 1 });

const revenueEntrySchema2 = mongoose.Schema;
const RevenueEntry = mongoose.model('RevenueEntry', revenueEntrySchema);

const revenueSchema = new mongoose.Schema({
  // Period
  period: {
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },

  // Revenue breakdown
  revenue: {
    subscription: { type: Number, default: 0 },
    transactional: { type: Number, default: 0 }, // PPV, rentals, purchases
    advertising: { type: Number, default: 0 },
    sponsorship: { type: Number, default: 0 },
    affiliate: { type: Number, default: 0 },
    licensing: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },

  // Cost breakdown
  costs: {
    content: { type: Number, default: 0 }, // royalties, licenses
    hosting: { type: Number, default: 0 },
    cdn: { type: Number, default: 0 },
    encoding: { type: Number, default: 0 },
    marketing: { type: Number, default: 0 },
    operations: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },

  // Gross profit
  grossProfit: Number,
  netProfit: Number,
  margin: Number, // percentage

  // Growth
  growth: {
    revenue: Number, // percentage vs previous period
    subscribers: Number,
    arpu: Number,
  },

  // KPIs
  kpis: {
    mrr: Number, // Monthly Recurring Revenue
    arr: Number, // Annual Recurring Revenue
    arpu: Number, // Average Revenue Per User
    arpuDelta: Number,
    ltv: Number, // Lifetime Value
    cac: Number, // Customer Acquisition Cost
    ltvCacRatio: Number,
    churnRate: Number,
    nps: Number, // Net Promoter Score
  },

  // Subscriber metrics
  subscribers: {
    start: { type: Number, default: 0 },
    new: { type: Number, default: 0 },
    upgrades: { type: Number, default: 0 },
    downgrades: { type: Number, default: 0 },
    churned: { type: Number, default: 0 },
    end: { type: Number, default: 0 },
    trial: { type: Number, default: 0 },
    free: { type: Number, default: 0 },
    paid: { type: Number, default: 0 },
  },

  // Content metrics
  content: {
    totalContent: { type: Number, default: 0 },
    newContent: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    totalWatchHours: { type: Number, default: 0 },
    avgWatchTime: Number,
    completionRate: Number,
  },

  // Advertising metrics
  advertising: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    ctr: Number,
    cpm: Number,
    cpc: Number,
    fillRate: Number,
    revenue: { type: Number, default: 0 },
  },

  // Geographic breakdown
  byCountry: [{
    country: String,
    revenue: Number,
    subscribers: Number,
    contentViews: Number,
  }],

  // Content breakdown
  byContent: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    title: String,
    views: Number,
    revenue: Number,
    watchTime: Number,
  }],

  // Channel breakdown
  byChannel: [{
    channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel' },
    name: String,
    revenue: Number,
    views: Number,
  }],

  // Daily breakdown
  daily: [{
    date: Date,
    revenue: Number,
    subscribers: Number,
    views: Number,
  }],

  // Forecast
  forecast: {
    nextPeriod: Number,
    confidence: Number,
    assumptions: [String],
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'calculated', 'verified', 'locked', 'adjusted'],
    default: 'draft',
  },

  // Notes
  notes: String,

}, { timestamps: true });

// Calculate totals before saving
revenueSchema.pre('save', function(next) {
  // Sum revenue
  this.revenue.total = Object.values(this.revenue)
    .filter((v, k) => k !== 'total' && typeof v === 'number')
    .reduce((a, b) => a + b, 0);

  // Sum costs
  this.costs.total = Object.values(this.costs)
    .filter((v, k) => k !== 'total' && typeof v === 'number')
    .reduce((a, b) => a + b, 0);

  // Calculate profit
  this.grossProfit = this.revenue.total;
  this.netProfit = this.revenue.total - this.costs.total;
  this.margin = this.revenue.total > 0
    ? (this.netProfit / this.revenue.total) * 100
    : 0;

  // Calculate KPIs
  if (this.subscribers.paid > 0) {
    this.kpis.arpu = this.revenue.total / this.subscribers.paid;
  }

  this.kpis.mrr = this.revenue.subscription / (this.period.type === 'monthly' ? 1 : 12);
  this.kpis.arr = this.kpis.mrr * 12;

  if (this.kpis.cac > 0) {
    this.kpis.ltvCacRatio = this.kpis.ltv / this.kpis.cac;
  }

  if (this.subscribers.start > 0) {
    this.kpis.churnRate = (this.subscribers.churned / this.subscribers.start) * 100;
  }

  next();
});

// Indexes
revenueSchema.index({ 'period.startDate': -1 });
revenueSchema.index({ 'period.type': 1, 'period.startDate': -1 });
revenueSchema.index({ status: 1 });

// Methods
revenueSchema.methods.calculateGrowth = async function(previousPeriod) {
  if (!previousPeriod) return;

  this.growth = {
    revenue: ((this.revenue.total - previousPeriod.revenue.total) / previousPeriod.revenue.total) * 100,
    subscribers: ((this.subscribers.paid - previousPeriod.subscribers.paid) / previousPeriod.subscribers.paid) * 100,
    arpu: ((this.kpis.arpu - previousPeriod.kpis.arpu) / previousPeriod.kpis.arpu) * 100,
  };

  await this.save();
};

revenueSchema.methods.generateForecast = function() {
  // Simple linear forecast based on trends
  const avgGrowth = this.growth?.revenue || 5; // default 5%
  const confidence = Math.min(95, 70 + Math.random() * 20); // 70-95%

  this.forecast = {
    nextPeriod: this.revenue.total * (1 + avgGrowth / 100),
    confidence,
    assumptions: [
      `Based on ${avgGrowth.toFixed(1)}% period-over-period growth`,
      'Assumes similar content library and marketing spend',
      'Does not account for seasonal variations',
    ],
  };

  return this.forecast;
};

revenueSchema.methods.adjust = function(reason, adjustments) {
  this.status = 'adjusted';
  this.adjustments = adjustments;
  this.adjustmentReason = reason;
  this.adjustmentDate = new Date();
  return this;
};

// Statics
revenueSchema.statics.getCurrentPeriod = function(type = 'monthly') {
  const now = new Date();
  let startDate, endDate;

  if (type === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);
  } else if (type === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else if (type === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1);
    endDate = new Date(now.getFullYear(), 11, 31);
  }

  return this.findOne({
    'period.type': type,
    'period.startDate': startDate,
  });
};

revenueSchema.statics.getTrend = async function(type = 'monthly', months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return this.aggregate([
    {
      $match: {
        'period.type': type,
        'period.startDate': { $gte: startDate },
        status: { $in: ['calculated', 'verified', 'locked'] },
      },
    },
    { $sort: { 'period.startDate': 1 } },
    {
      $group: {
        _id: null,
        revenue: { $push: '$revenue.total' },
        dates: { $push: '$period.startDate' },
        mrr: { $push: '$kpis.mrr' },
        subscribers: { $push: '$subscribers.paid' },
        churn: { $push: '$kpis.churnRate' },
      },
    },
  ]);
};

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = { Revenue, RevenueEntry };
