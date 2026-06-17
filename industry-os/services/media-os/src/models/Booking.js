/**
 * Media OS - Booking Model
 * Ad slot bookings for campaigns
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // References
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  advertiserId: { type: mongoose.Schema.Types.ObjectId, ref: 'Advertiser', required: true },
  channelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: 'Program' },

  // Slot details
  slot: {
    type: { type: String, enum: ['pre_roll', 'mid_roll', 'post_roll', 'banner', 'sponsor', 'native'] },
    date: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String },
    duration: { type: Number, required: true }, // in seconds
    position: { type: Number }, // position in ad break
  },

  // Pricing
  pricing: {
    baseRate: { type: Number, required: true }, // per second or per impression
    unit: { type: String, enum: ['cpm', 'cpc', 'fixed'], default: 'cpm' },
    quantity: { type: Number, default: 1 },
    total: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    gst: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true },
  },

  // Targeting
  targeting: {
    demographics: mongoose.Schema.Types.Mixed,
    viewerSegments: [String],
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'booked', 'serving', 'completed', 'cancelled', 'no_fill'],
    default: 'draft',
  },

  // Creative
  adCreativeId: { type: mongoose.Schema.Types.ObjectId },
  creativeUrl: String,
  clickUrl: String,

  // Performance
  served: {
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    vtr: { type: Number, default: 0 }, // video completion rate
  },

  // RTMN Integration
  twinId: { type: String },
  sspBookingId: String, // from AdBazaar SSP
  sspBidId: String,

  // Invoice
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },

  // Notes
  notes: String,
  createdBy: String,

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
bookingSchema.index({ campaignId: 1, status: 1 });
bookingSchema.index({ channelId: 1, 'slot.date': 1 });
bookingSchema.index({ 'slot.date': 1, status: 1 });
bookingSchema.index({ advertiserId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, 'slot.date': -1 });

// Statics
bookingSchema.statics.findByCampaign = function(campaignId) {
  return this.find({ campaignId }).populate('channelId', 'name logo');
};

bookingSchema.statics.findByChannel = function(channelId, date) {
  return this.find({
    channelId,
    'slot.date': date,
    status: { $in: ['confirmed', 'booked', 'serving'] },
  }).populate('campaignId', 'name advertiser');
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
