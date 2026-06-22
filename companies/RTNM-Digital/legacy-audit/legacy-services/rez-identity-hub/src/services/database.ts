/**
 * MongoDB Database Layer
 *
 * Persistent storage for REZ Identity Hub
 * - Identities collection
 * - Profiles collection
 * - Social profiles collection
 * - Activity logs
 * - Sync status
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-identity-hub';

// ==================== SCHEMAS ====================

// Identity Schema
const identitySchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  primaryPhone: { type: String, index: true },
  primaryEmail: { type: String, index: true },
  alternatePhones: [String],
  alternateEmails: [String],
  status: { type: String, enum: ['verified', 'pending', 'unverified', 'flagged'], default: 'unverified' },
  identityScore: { type: Number, default: 0 },
  linkedIdentities: {
    customerId: String,
    merchantId: String,
    vendorId: String,
    employeeId: String
  },
  socialProfiles: [{
    platform: String,
    url: String,
    handle: String,
    displayName: String,
    followers: Number,
    verified: Boolean,
    verifiedAt: Date,
    verificationMethod: String
  }],
  activity: {
    totalAppsUsed: { type: Number, default: 0 },
    lastActivity: Date,
    totalTransactions: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastResolved: Date
}, { timestamps: true });

// Profile Schema (Customer/Merchant/Vendor/Employee)
const profileSchema = new mongoose.Schema({
  id: { type: String, required: true, index: true },
  identityId: { type: String, required: true, index: true },
  type: { type: String, enum: ['customer', 'merchant', 'vendor', 'employee'], required: true },
  data: mongoose.Schema.Types.Mixed,
  source: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Data Freshness Schema
const dataFreshnessSchema = new mongoose.Schema({
  identityId: { type: String, required: true, index: true },
  source: { type: String, required: true },
  lastUpdated: Date,
  freshness: { type: String, enum: ['fresh', 'stale', 'unknown'], default: 'unknown' },
  errorMessage: String,
  checkedAt: { type: Date, default: Date.now }
});

// Sync Status Schema
const syncStatusSchema = new mongoose.Schema({
  source: { type: String, required: true, unique: true },
  lastSync: Date,
  status: { type: String, enum: ['active', 'inactive', 'error', 'syncing'], default: 'inactive' },
  recordsSynced: { type: Number, default: 0 },
  errorMessage: String,
  nextScheduledSync: Date
});

// Activity Log Schema
const activityLogSchema = new mongoose.Schema({
  identityId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  source: String,
  details: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

// ==================== MODELS ====================

export const Identity = mongoose.model('Identity', identitySchema);
export const Profile = mongoose.model('Profile', profileSchema);
export const DataFreshness = mongoose.model('DataFreshness', dataFreshnessSchema);
export const SyncStatus = mongoose.model('SyncStatus', syncStatusSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// ==================== DATABASE SERVICE ====================

export class DatabaseService {
  private connected = false;

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await mongoose.connect(MONGODB_URI);
      this.connected = true;
      console.log('MongoDB connected to', MONGODB_URI);

      // Create indexes
      await this.createIndexes();
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await mongoose.disconnect();
    this.connected = false;
    console.log('MongoDB disconnected');
  }

  private async createIndexes(): Promise<void> {
    // Identity indexes
    await Identity.createIndexes();
    await Profile.createIndexes();
    await DataFreshness.createIndexes();
    await SyncStatus.createIndexes();
    await ActivityLog.createIndexes();
  }

  // ==================== IDENTITY OPERATIONS ====================

  async createIdentity(data: {
    id: string;
    primaryPhone?: string;
    primaryEmail?: string;
 }): Promise<any> {
    const identity = new Identity({
      ...data,
      status: 'unverified',
      identityScore: 0,
      linkedIdentities: {},
      socialProfiles: [],
      activity: {
        totalAppsUsed: 0,
        lastActivity: new Date(),
        totalTransactions: 0,
        totalSpent: 0,
        totalEarned: 0
      }
    });
    await identity.save();
    return identity;
  }

  async getIdentityById(id: string): Promise<any> {
    return Identity.findOne({ id });
  }

  async getIdentityByPhone(phone: string): Promise<any> {
    return Identity.findOne({ primaryPhone: phone });
  }

  async getIdentityByEmail(email: string): Promise<any> {
    return Identity.findOne({ primaryEmail: email.toLowerCase() });
  }

  async updateIdentity(id: string, updates: Record<string, any>): Promise<any> {
    return Identity.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
  }

  async searchIdentities(query: string, limit = 20): Promise<any[]> {
    const normalizedQuery = query.toLowerCase();
    return Identity.find({
      $or: [
        { primaryPhone: { $regex: query, $options: 'i' } },
        { primaryEmail: { $regex: normalizedQuery, $options: 'i' } }
      ]
    }).limit(limit);
  }

  async getAllIdentities(limit = 100, skip = 0): Promise<any[]> {
    return Identity.find().limit(limit).skip(skip).sort({ updatedAt: -1 });
  }

  async getIdentitiesByType(type: string, limit = 100): Promise<any[]> {
    const profiles = await Profile.find({ type }).limit(limit);
    const identityIds = profiles.map(p => p.identityId);
    return Identity.find({ id: { $in: identityIds } });
  }

  // ==================== PROFILE OPERATIONS ====================

  async createProfile(data: {
    id: string;
    identityId: string;
    type: string;
    data: Record<string, any>;
    source: string;
  }): Promise<any> {
    const profile = new Profile(data);
    await profile.save();
    return profile;
  }

  async getProfileById(id: string): Promise<any> {
    return Profile.findOne({ id });
  }

  async getProfilesByIdentityId(identityId: string): Promise<any[]> {
    return Profile.find({ identityId });
  }

  async getProfileByType(identityId: string, type: string): Promise<any> {
    return Profile.findOne({ identityId, type });
  }

  async updateProfile(id: string, updates: Record<string, any>): Promise<any> {
    return Profile.findOneAndUpdate(
      { id },
      { ...updates, updatedAt: new Date() },
      { new: true }
    );
  }

  // ==================== DATA FRESHNESS ====================

  async updateDataFreshness(identityId: string, source: string, freshness: 'fresh' | 'stale' | 'unknown'): Promise<void> {
    await DataFreshness.findOneAndUpdate(
      { identityId, source },
      {
        identityId,
        source,
        lastUpdated: new Date(),
        freshness,
        checkedAt: new Date()
      },
      { upsert: true }
    );
  }

  async getDataFreshness(identityId: string): Promise<any[]> {
    return DataFreshness.find({ identityId });
  }

  // ==================== SYNC STATUS ====================

  async updateSyncStatus(source: string, status: 'active' | 'inactive' | 'error' | 'syncing', recordsSynced = 0, errorMessage?: string): Promise<void> {
    await SyncStatus.findOneAndUpdate(
      { source },
      {
        source,
        lastSync: new Date(),
        status,
        recordsSynced,
        errorMessage,
        nextScheduledSync: this.getNextSyncTime(source)
      },
      { upsert: true }
    );
  }

  async getSyncStatus(source?: string): Promise<any[]> {
    if (source) {
      return SyncStatus.find({ source });
    }
    return SyncStatus.find();
  }

  private getNextSyncTime(source: string): Date {
    const now = new Date();
    // Schedule based on sync frequency
    const intervals: Record<string, number> = {
      realtime: 0,
      hourly: 60 * 60 * 1000,
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000
    };
    const interval = intervals[source] || intervals.daily;
    return new Date(now.getTime() + interval);
  }

  // ==================== ACTIVITY LOG ====================

  async logActivity(identityId: string, action: string, source?: string, details?: Record<string, any>): Promise<void> {
    const log = new ActivityLog({
      identityId,
      action,
      source,
      details,
      timestamp: new Date()
    });
    await log.save();
  }

  async getActivityLog(identityId: string, limit = 50): Promise<any[]> {
    return ActivityLog.find({ identityId })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  // ==================== STATS ====================

  async getStats(): Promise<{
    totalIdentities: number;
    byType: Record<string, number>;
    verified: number;
    unverified: number;
    totalProfiles: number;
    syncedSources: number;
  }> {
    const [totalIdentities, profiles, syncStatuses] = await Promise.all([
      Identity.countDocuments(),
      Profile.find(),
      SyncStatus.find({ status: 'active' })
    ]);

    const byType: Record<string, number> = {};
    for (const profile of profiles) {
      byType[profile.type] = (byType[profile.type] || 0) + 1;
    }

    const verified = await Identity.countDocuments({ status: 'verified' });

    return {
      totalIdentities,
      byType,
      verified,
      unverified: totalIdentities - verified,
      totalProfiles: profiles.length,
      syncedSources: syncStatuses.length
    };
  }
}

export const databaseService = new DatabaseService();