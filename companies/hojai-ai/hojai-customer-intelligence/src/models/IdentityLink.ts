import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IIdentityLink extends Document {
  linkId: string;
  masterId: string;
  linkedId: string;
  linkType: 'merged' | 'resolved' | 'associated';
  confidence: number;
  matchedFields: string[];
  metadata?: Record<string, unknown>;
  linkedAt: Date;
  linkedBy: string;
  isActive: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

const IdentityLinkSchema = new Schema<IIdentityLink>({
  linkId: {
    type: String,
    required: true,
    unique: true,
    default: () => `LINK-${uuidv4().substring(0, 8).toUpperCase()}`
  },
  masterId: {
    type: String,
    required: true,
    index: true
  },
  linkedId: {
    type: String,
    required: true,
    index: true
  },
  linkType: {
    type: String,
    enum: ['merged', 'resolved', 'associated'],
    required: true
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  matchedFields: [{
    type: String
  }],
  metadata: {
    type: Schema.Types.Mixed
  },
  linkedAt: {
    type: Date,
    default: Date.now
  },
  linkedBy: {
    type: String,
    required: true,
    default: 'identity-resolution-service'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  resolvedAt: Date,
  resolvedBy: String,
  resolution: String
}, {
  timestamps: true
});

// Compound indexes for efficient lookups
IdentityLinkSchema.index({ masterId: 1, isActive: 1 });
IdentityLinkSchema.index({ linkedId: 1, isActive: 1 });
IdentityLinkSchema.index({ linkType: 1, linkedAt: -1 });
IdentityLinkSchema.index({ confidence: -1 });

// Static methods
IdentityLinkSchema.statics.findByMasterId = function(masterId: string) {
  return this.find({ masterId, isActive: true });
};

IdentityLinkSchema.statics.findByLinkedId = function(linkedId: string) {
  return this.find({ linkedId, isActive: true });
};

IdentityLinkSchema.statics.findLink = function(masterId: string, linkedId: string) {
  return this.findOne({
    $or: [
      { masterId, linkedId, isActive: true },
      { masterId: linkedId, linkedId: masterId, isActive: true }
    ]
  });
};

IdentityLinkSchema.statics.getAllLinkedIds = async function(masterId: string): Promise<string[]> {
  const links = await this.find({ masterId, isActive: true });
  return links.map(l => l.linkedId);
};

IdentityLinkSchema.statics.linkCustomers = async function(
  masterId: string,
  linkedId: string,
  linkType: 'merged' | 'resolved' | 'associated',
  confidence: number,
  matchedFields: string[],
  linkedBy: string,
  metadata?: Record<string, unknown>
): Promise<IIdentityLink> {
  // Check if link already exists
  const existingLink = await this.findLink(masterId, linkedId);
  if (existingLink) {
    // Update existing link
    existingLink.confidence = confidence;
    existingLink.matchedFields = [...new Set([...existingLink.matchedFields, ...matchedFields])];
    existingLink.metadata = { ...existingLink.metadata, ...metadata };
    return existingLink.save();
  }

  // Create new link
  const link = new this({
    masterId,
    linkedId,
    linkType,
    confidence,
    matchedFields,
    linkedBy,
    metadata
  });

  return link.save();
};

IdentityLinkSchema.statics.unlinkCustomer = async function(
  linkId: string,
  resolvedBy: string,
  resolution: string
): Promise<IIdentityLink | null> {
  const link = await this.findById(linkId);
  if (!link) return null;

  link.isActive = false;
  link.resolvedAt = new Date();
  link.resolvedBy = resolvedBy;
  link.resolution = resolution;

  return link.save();
};

export const IdentityLink = mongoose.model<IIdentityLink>('IdentityLink', IdentityLinkSchema);
