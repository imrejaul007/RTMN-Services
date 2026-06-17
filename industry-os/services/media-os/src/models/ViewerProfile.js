/**
 * Media OS - Viewer Profile Model
 * User profiles with parental controls and preferences
 */

const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  // Owner (account holder)
  viewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Viewer', required: true },

  // Profile info
  name: { type: String, required: true, maxLength: 50 },
  avatar: String,
  avatarUrl: String,
  type: {
    type: String,
    enum: ['adult', 'kids', 'teen'],
    default: 'adult',
  },

  // PIN protection
  pin: {
    enabled: { type: Boolean, default: false },
    hash: String,
    attempts: { type: Number, default: 0 },
    lockedUntil: Date,
  },

  // Parental controls (for kids profiles)
  parentalControls: {
    enabled: { type: Boolean, default: false },
    maxRating: { type: String, enum: ['G', 'PG', 'PG-13', 'UA'], default: 'PG' },
    allowedGenres: [String],
    blockedGenres: [String],
    allowedChannels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    blockedChannels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
    maxWatchTime: { type: Number, default: 120 }, // minutes per day
    watchTimeUsed: { type: Number, default: 0 },
    watchTimeResetAt: Date,
    bedTime: {
      enabled: { type: Boolean, default: false },
      start: String, // HH:mm format
      end: String,
    },
  },

  // Kids Mode specific
  kidsMode: {
    enabled: { type: Boolean, default: false },
    ageGroup: { type: String, enum: ['0-3', '4-6', '7-9', '10-12', '13-15', '16+'] },
    interests: [String], // e.g., 'animals', 'cars', 'music'
    contentFilter: { type: String, enum: ['strict', 'moderate', 'relaxed'] },
    showProgress: { type: Boolean, default: true },
    autoplayNext: { type: Boolean, default: true },
  },

  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    subtitles: {
      enabled: { type: Boolean, default: false },
      language: { type: String, default: 'en' },
      size: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      color: { type: String, default: '#ffffff' },
    },
    audio: {
      language: { type: String, default: 'original' },
      volume: { type: Number, default: 100 },
      spatialAudio: { type: Boolean, default: false },
    },
    video: {
      quality: { type: String, enum: ['auto', 'low', 'medium', 'high', '4k'], default: 'auto' },
      autoplay: { type: Boolean, default: true },
      captions: { type: Boolean, default: false },
    },
    playback: {
      skipIntro: { type: Boolean, default: false },
      skipCredits: { type: Boolean, default: false },
      continuousPlay: { type: Boolean, default: true },
    },
  },

  // Privacy
  privacy: {
    viewingActivity: { type: Boolean, default: true },
    recommendations: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
  },

  // Family linking
  family: {
    isFamilyManaged: { type: Boolean, default: false },
    parentProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ViewerProfile' },
    permissions: [String],
  },

  // Stats
  stats: {
    totalWatchTime: { type: Number, default: 0 }, // seconds
    contentWatched: { type: Number, default: 0 },
    lastActive: Date,
    createdAt: { type: Date, default: Date.now },
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active',
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
profileSchema.index({ viewerId: 1 });
profileSchema.index({ name: 1 });
profileSchema.index({ 'kidsMode.enabled': 1 });
profileSchema.index({ type: 1 });

// Virtuals
profileSchema.virtual('isKidsProfile').get(function() {
  return this.type === 'kids' || this.kidsMode?.enabled;
});

profileSchema.virtual('canAccessContent').get(function() {
  return this.status === 'active' && !this.isLocked();
});

profileSchema.virtual('isLocked').get(function() {
  if (this.pin?.lockedUntil && new Date() < this.pin.lockedUntil) {
    return true;
  }
  return false;
});

// Methods
profileSchema.methods.setPin = async function(pin) {
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash(pin, 10);
  this.pin.enabled = true;
  this.pin.hash = hash;
  this.pin.attempts = 0;
  await this.save();
  return this;
};

profileSchema.methods.verifyPin = async function(pin) {
  if (!this.pin?.enabled || !this.pin?.hash) {
    return true; // No PIN required
  }

  const bcrypt = require('bcryptjs');
  const isValid = await bcrypt.compare(pin, this.pin.hash);

  if (!isValid) {
    this.pin.attempts += 1;
    if (this.pin.attempts >= 5) {
      this.pin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
    }
    await this.save();
    return false;
  }

  this.pin.attempts = 0;
  await this.save();
  return true;
};

profileSchema.methods.checkContentAccess = function(content) {
  // Check parental controls
  if (this.parentalControls?.enabled) {
    // Check rating
    const ratingOrder = ['G', 'PG', 'PG-13', 'UA', 'A'];
    const maxIndex = ratingOrder.indexOf(this.parentalControls.maxRating);
    const contentIndex = ratingOrder.indexOf(content.rating || 'G');

    if (contentIndex > maxIndex) {
      return { allowed: false, reason: 'Content rating too high' };
    }

    // Check genres
    if (this.parentalControls.blockedGenres?.length) {
      const hasBlockedGenre = content.genres?.some(g =>
        this.parentalControls.blockedGenres.includes(g)
      );
      if (hasBlockedGenre) {
        return { allowed: false, reason: 'Content genre blocked' };
      }
    }

    // Check watch time
    if (this.parentalControls.maxWatchTime) {
      const today = new Date();
      if (!this.parentalControls.watchTimeResetAt ||
          this.parentalControls.watchTimeResetAt < today) {
        this.parentalControls.watchTimeUsed = 0;
        this.parentalControls.watchTimeResetAt = today;
      }

      if (this.parentalControls.watchTimeUsed >= this.parentalControls.maxWatchTime) {
        return { allowed: false, reason: 'Daily watch time limit reached' };
      }
    }

    // Check bed time
    if (this.parentalControls.bedTime?.enabled) {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const bedtime = this.parentalControls.bedTime;

      if (currentTime >= bedtime.start || currentTime < bedtime.end) {
        return { allowed: false, reason: 'Bedtime active' };
      }
    }
  }

  return { allowed: true };
};

profileSchema.methods.recordWatchTime = async function(minutes) {
  this.stats.totalWatchTime += minutes * 60;
  this.stats.contentWatched += 1;
  this.stats.lastActive = new Date();

  if (this.parentalControls?.enabled) {
    this.parentalControls.watchTimeUsed += minutes;
  }

  await this.save();
  return this;
};

profileSchema.methods.resetWatchTime = function() {
  if (this.parentalControls) {
    this.parentalControls.watchTimeUsed = 0;
    this.parentalControls.watchTimeResetAt = new Date();
  }
  this.save();
  return this;
};

profileSchema.methods.enableKidsMode = function(ageGroup) {
  this.kidsMode.enabled = true;
  this.kidsMode.ageGroup = ageGroup;
  this.type = 'kids';
  this.parentalControls.enabled = true;
  this.parentalControls.maxRating = 'PG';
  this.save();
  return this;
};

profileSchema.methods.updatePreferences = function(prefs) {
  Object.assign(this.preferences, prefs);
  this.save();
  return this;
};

// Statics
profileSchema.statics.findByViewer = function(viewerId) {
  return this.find({ viewerId, status: 'active' });
};

profileSchema.statics.findKidsProfiles = function(viewerId) {
  return this.find({
    viewerId,
    $or: [
      { type: 'kids' },
      { 'kidsMode.enabled': true },
    ],
    status: 'active',
  });
};

profileSchema.statics.getFamilyProfiles = function(viewerId) {
  return this.find({ viewerId, status: 'active' }).sort('createdAt');
};

const ViewerProfile = mongoose.model('ViewerProfile', profileSchema);

module.exports = ViewerProfile;
