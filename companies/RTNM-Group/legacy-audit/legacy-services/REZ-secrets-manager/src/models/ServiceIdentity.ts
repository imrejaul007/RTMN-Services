import mongoose, { Document, Schema } from 'mongoose';
import { IServiceIdentity } from '../types';

export interface ServiceIdentityDocument extends Omit<IServiceIdentity, '_id'>, Document {}

const ServiceIdentitySchema = new Schema<ServiceIdentityDocument>({
  serviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  serviceName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 255
  },
  apiKeyHash: {
    type: String,
    required: true
  },
  permissions: {
    type: [String],
    default: []
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastAccessedAt: {
    type: Date
  }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  collection: 'service_identities'
});

// Indexes
ServiceIdentitySchema.index({ serviceId: 1, isActive: 1 });
ServiceIdentitySchema.index({ serviceName: 1 });

// Instance methods
ServiceIdentitySchema.methods.hasPermission = function(permission: string): boolean {
  if (this.permissions.includes('*')) return true;
  return this.permissions.includes(permission);
};

ServiceIdentitySchema.methods.hasAnyPermission = function(permissions: string[]): boolean {
  return permissions.some(p => this.hasPermission(p));
};

ServiceIdentitySchema.methods.recordAccess = async function(): Promise<void> {
  this.lastAccessedAt = new Date();
  await this.save();
};

// Static methods
ServiceIdentitySchema.statics.findByServiceId = function(serviceId: string) {
  return this.findOne({ serviceId });
};

ServiceIdentitySchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

ServiceIdentitySchema.statics.deactivate = async function(serviceId: string): Promise<boolean> {
  const result = await this.updateOne(
    { serviceId },
    { isActive: false }
  );
  return result.modifiedCount > 0;
};

ServiceIdentitySchema.statics.activate = async function(serviceId: string): Promise<boolean> {
  const result = await this.updateOne(
    { serviceId },
    { isActive: true }
  );
  return result.modifiedCount > 0;
};

export const ServiceIdentity = mongoose.model<ServiceIdentityDocument>('ServiceIdentity', ServiceIdentitySchema);
