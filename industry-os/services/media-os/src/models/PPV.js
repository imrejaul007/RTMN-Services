/**
 * Media OS - PPV (Pay Per View) Model
 * Transactional video purchases and rentals
 */

const mongoose = require('mongoose');

const ppvPricingSchema = new mongoose.Schema({
  // Rental
  rental: {
    enabled: { type: Boolean, default: false },
    price: Number,
    currency: { type: String, default: 'INR' },
    duration: { type: Number, default: 48 }, // hours
  },

  // Purchase
  purchase: {
    enabled: { type: Boolean, default: false },
    price: Number,
    currency: { type: String, default: 'INR' },
  },

  // Early release
  earlyRelease: {
    enabled: { type: Boolean, default: false },
    daysBeforeSubscription: { type: Number, default: 0 },
    price: Number,
  },
}, { _id: false });

const ppvTransactionSchema = new mongoose.Schema({
  // Transaction info
  transactionId: { type: String, unique: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },

  // Type
  type: {
    type: String,
    enum: ['rental', 'purchase', 'early_access'],
    required: true,
  },

  // Pricing
  pricing: {
    base: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
  },

  // Rental details
  rental: {
    startTime: Date,
    endTime: Date,
    expiresAt: Date,
    extended: { type: Boolean, default: false },
    extensions: { type: Number, default: 0 },
    maxExtensions: { type: Number, default: 2 },
  },

  // Access
  access: {
    grantedAt: Date,
    expiresAt: Date,
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Stream' },
    maxDevices: { type: Number, default: 2 },
    activeDevices: { type: Number, default: 0 },
  },

  // Payment
  payment: {
    method: { type: String, enum: ['wallet', 'card', 'upi', 'netbanking'] },
    transactionId: String,
    gateway: String,
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'] },
    paidAt: Date,
  },

  // Revenue share
  revenueShare: {
    platform: { type: Number, default: 0 },
    contentOwner: { type: Number, default: 0 },
    distributor: { type: Number, default: 0 },
    talent: { type: Number, default: 0 },
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'expired', 'cancelled', 'refunded', 'pending'],
    default: 'pending',
  },

  // Devices
  devices: [{
    deviceId: String,
    deviceType: String,
    firstUsedAt: Date,
    lastUsedAt: Date,
  }],

  // Playback
  playback: {
    watchTime: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    completionRate: { type: Number, default: 0 },
  },

}, { timestamps: true });

// Generate transaction ID
ppvTransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const prefix = this.type === 'rental' ? 'RNT' : this.type === 'early_access' ? 'EAR' : 'PPV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.transactionId = `${prefix}-${timestamp}-${random}`;
  }

  // Calculate expiry
  if (this.type === 'rental' && !this.rental.expiresAt) {
    this.rental.expiresAt = new Date(Date.now() + (this.rental.duration || 48) * 60 * 60 * 1000);
    this.access.expiresAt = this.rental.expiresAt;
  }

  next();
});

// Indexes
ppvTransactionSchema.index({ viewerId: 1, contentId: 1 });
ppvTransactionSchema.index({ transactionId: 1 }, { unique: true });
ppvTransactionSchema.index({ 'payment.status': 1 });
ppvTransactionSchema.index({ status: 1 });
ppvTransactionSchema.index({ 'rental.expiresAt': 1, status: 1 });

// Virtuals
ppvTransactionSchema.virtual('isExpired').get(function() {
  if (this.type !== 'rental') return false;
  return new Date() > this.rental.expiresAt;
});

ppvTransactionSchema.virtual('canExtend').get(function() {
  return this.type === 'rental' &&
         this.rental.extensions < this.rental.maxExtensions &&
         this.status === 'active';
});

// Methods
ppvTransactionSchema.methods.activate = function() {
  this.status = 'active';
  this.access.grantedAt = new Date();
  if (this.type === 'rental') {
    this.rental.startTime = new Date();
    this.rental.expiresAt = new Date(Date.now() + this.rental.duration * 60 * 60 * 1000);
    this.access.expiresAt = this.rental.expiresAt;
  }
  return this;
};

ppvTransactionSchema.methods.extend = async function(hours = 24) {
  if (!this.canExtend) {
    throw new Error('Cannot extend rental');
  }

  const extensionFee = hours * 10; // $10 per 24 hours

  this.rental.endTime = new Date(this.rental.endTime.getTime() + hours * 60 * 60 * 1000);
  this.rental.expiresAt = new Date(this.rental.expiresAt.getTime() + hours * 60 * 60 * 1000);
  this.access.expiresAt = this.rental.expiresAt;
  this.rental.extended = true;
  this.rental.extensions += 1;

  await this.save();
  return { extended: true, newExpiry: this.rental.expiresAt, fee: extensionFee };
};

ppvTransactionSchema.methods.recordWatchTime = async function(seconds) {
  this.playback.watchTime += seconds;

  const content = await mongoose.model('Content').findById(this.contentId);
  if (content?.duration) {
    this.playback.completionRate = (this.playback.watchTime / (content.duration * 60)) * 100;
    if (this.playback.completionRate >= 90) {
      this.playback.completed = true;
    }
  }

  await this.save();
  return this;
};

ppvTransactionSchema.methods.addDevice = async function(deviceInfo) {
  if (this.devices.length >= this.access.maxDevices) {
    throw new Error('Maximum devices reached');
  }

  this.devices.push({
    ...deviceInfo,
    firstUsedAt: new Date(),
    lastUsedAt: new Date(),
  });
  this.access.activeDevices = this.devices.length;

  await this.save();
  return this;
};

ppvTransactionSchema.methods.expire = function() {
  this.status = 'expired';
  return this;
};

// Statics
ppvTransactionSchema.statics.findActiveForViewer = function(viewerId) {
  return this.find({
    viewerId,
    status: 'active',
    type: 'rental',
    'rental.expiresAt': { $gt: new Date() },
  });
};

ppvTransactionSchema.statics.findPurchased = function(viewerId) {
  return this.find({
    viewerId,
    type: 'purchase',
    status: 'active',
  });
};

ppvTransactionSchema.statics.findExpired = function() {
  return this.updateMany({
    type: 'rental',
    status: 'active',
    'rental.expiresAt': { $lt: new Date() },
  }, {
    $set: { status: 'expired' },
  });
};

const PPVTransaction = mongoose.model('PPVTransaction', ppvTransactionSchema);

module.exports = PPVTransaction;
