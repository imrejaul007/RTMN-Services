/**
 * Grocery Briefing Models
 * FreshMart 8AM Story: "Good Morning Ramesh. Revenue Yesterday: ₹3.4 Lakhs"
 */

const mongoose = require('mongoose');

const briefingSchema = new mongoose.Schema({
  briefing_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  store_id: {
    type: String,
    required: true,
    index: true
  },
  owner_id: {
    type: String,
    required: true,
    index: true
  },

  // Date
  date: {
    type: Date,
    required: true
  },

  // Financial Metrics
  financial: {
    revenue: {
      yesterday: Number,
      today_target: Number,
      week_to_date: Number,
      month_to_date: Number,
      trend: String  // 'up' | 'down' | 'stable'
    },
    orders: {
      yesterday: Number,
      today: Number,
      average: Number
    },
    average_order_value: {
      yesterday: Number,
      trend: String
    },
    margin: {
      gross: Number,
      net: Number
    }
  },

  // Customer Metrics
  customers: {
    total: Number,
    new: Number,
    returning: Number,
    satisfaction_score: {
      value: Number,
      trend: String
    },
    complaints: Number,
    ratings: {
      average: Number,
      count: Number
    }
  },

  // Inventory Metrics
  inventory: {
    health_percentage: Number,
    low_stock_items: Number,
    out_of_stock: Number,
    expiring_soon: Number,
    waste_value: Number,
    reorder_needed: Number
  },

  // Delivery Metrics
  delivery: {
    orders: Number,
    on_time_rate: Number,
    average_time: Number,
    failed_deliveries: Number
  },

  // Top Insights
  insights: [{
    type: {
      type: String,
      enum: ['positive', 'negative', 'opportunity', 'alert']
    },
    category: String,
    title: String,
    description: String,
    metric: String,
    value: String
  }],

  // Recommendations
  recommendations: [{
    priority: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    category: String,
    title: String,
    description: String,
    action: String,
    estimated_impact: String
  }],

  // Generated text
  generated_text: String,

  // Status
  status: {
    type: String,
    enum: ['generating', 'ready', 'delivered', 'read'],
    default: 'generating'
  },

  delivered_at: Date,
  read_at: Date

}, { timestamps: true });

briefingSchema.index({ owner_id: 1, date: -1 });
briefingSchema.index({ store_id: 1, date: -1 });

const GroceryBriefing = mongoose.model('GroceryBriefing', briefingSchema);

module.exports = { GroceryBriefing };
