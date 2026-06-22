import mongoose, { Document, Schema } from 'mongoose';
import { ISecret, ISecretVersion, SecretType, SecretStatus, RotationSchedule } from '../types';

export interface SecretDocument extends Omit<ISecret, '_id'>, Document {}

const SecretVersionSchema = new Schema<ISecretVersion>({
  version: { type: Number, required: true },
  valueHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  reason: { type: String },
  expiresAt: { type: Date }
}, { _id: false });

const SecretRotationConfigSchema = new Schema({
  rotateAutomatically: { type: Boolean, default: false },
  customCronExpression: { type: String },
  rotationWindow: { type: Number },
  notifyBeforeRotation: { type: Number }
}, { _id: false });

const SecretSchema = new Schema<SecretDocument>({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    maxlength: 255
  },
  type: {
    type: String,
    enum: Object.values(SecretType),
    required: true,
    index: true
  },
  currentValueHash: {
    type: String,
    required: true
  },
  versions: {
    type: [SecretVersionSchema],
    default: []
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  tags: {
    type: [String],
    default: [],
    index: true
  },
  rotationSchedule: {
    type: String,
    enum: Object.values(RotationSchedule),
    default: RotationSchedule.MANUAL
  },
  rotationConfig: {
    type: SecretRotationConfigSchema,
    default: () => ({})
  },
  allowedServices: {
    type: [String],
    default: [],
    index: true
  },
  maxVersions: {
    type: Number,
    default: 10,
    min: 1,
    max: 100
  },
  status: {
    type: String,
    enum: Object.values(SecretStatus),
    default: SecretStatus.ACTIVE,
    index: true
  },
  expiresAt: {
    type: Date,
    index: true
  },
  isDynamic: {
    type: Boolean,
    default: false,
    index: true
  },
  lastRotatedAt: {
    type: Date
  },
  nextRotationAt: {
    type: Date,
    index: true
  },
  createdBy: {
    type: String,
    required: true
  }
}, {
  timestamps: true,
  collection: 'secrets'
});

// Compound indexes for common queries
SecretSchema.index({ name: 1, type: 1 });
SecretSchema.index({ status: 1, expiresAt: 1 });
SecretSchema.index({ tags: 1, status: 1 });
SecretSchema.index({ allowedServices: 1, status: 1 });
SecretSchema.index({ nextRotationAt: 1, rotationSchedule: 1 });

// Pre-save hook to manage version history
SecretSchema.pre('save', function(next) {
  if (this.isModified('currentValueHash')) {
    const existingVersion = this.versions.find(v => v.version === this.versions.length);
    if (!existingVersion || existingVersion.valueHash !== this.currentValueHash) {
      this.versions.push({
        version: this.versions.length + 1,
        valueHash: this.currentValueHash,
        createdAt: new Date(),
        createdBy: (this as any)._userId || 'system'
      });

      // Trim versions if exceeding maxVersions
      if (this.versions.length > this.maxVersions) {
        this.versions = this.versions.slice(-this.maxVersions);
      }
    }
  }
  next();
});

// Instance methods
SecretSchema.methods.rotateValue = async function(newValueHash: string, userId: string, reason?: string): Promise<void> {
  this.currentValueHash = newValueHash;
  this.lastRotatedAt = new Date();
  this.versions.push({
    version: this.versions.length + 1,
    valueHash: newValueHash,
    createdAt: new Date(),
    createdBy: userId,
    reason
  });

  // Trim versions
  if (this.versions.length > this.maxVersions) {
    this.versions = this.versions.slice(-this.maxVersions);
  }

  await this.save();
};

SecretSchema.methods.isExpired = function(): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

SecretSchema.methods.canBeAccessedBy = function(serviceId: string): boolean {
  if (this.allowedServices.length === 0) return true; // No restrictions
  return this.allowedServices.includes(serviceId);
};

// Static methods
SecretSchema.statics.findByName = function(name: string) {
  return this.findOne({ name });
};

SecretSchema.statics.findByService = function(serviceId: string) {
  return this.find({
    $or: [
      { allowedServices: serviceId },
      { allowedServices: { $size: 0 } }
    ]
  });
};

SecretSchema.statics.findRequiringRotation = function() {
  const now = new Date();
  return this.find({
    status: SecretStatus.ACTIVE,
    nextRotationAt: { $lte: now },
    $or: [
      { 'rotationConfig.rotateAutomatically': true },
      { rotationSchedule: { $ne: RotationSchedule.MANUAL } }
    ]
  });
};

export const Secret = mongoose.model<SecretDocument>('Secret', SecretSchema);
