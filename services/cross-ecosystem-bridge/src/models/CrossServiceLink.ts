/**
 * CrossServiceLink Model
 * Links between entities across different ecosystem services
 */

import mongoose, { Document, Schema } from 'mongoose';
import { EcosystemService } from '../types';

// Sub-schema for linked entities
const LinkedEntitySchema = new Schema({
  service: {
    type: String,
    enum: ['hojai', 'rez-consumer', 'rez-merchant', 'rez-pos', 'stayown', 'adbazaar', 'corpid', 'rtmn-gateway'],
    required: true,
  },
  entityType: {
    type: String,
    required: true,
    enum: ['user', 'account', 'profile', 'guest', 'customer', 'merchant', 'device', 'household'],
  },
  entityId: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['primary', 'secondary', 'dependent'],
    default: 'primary',
  },
  linkedAt: {
    type: Date,
    default: Date.now,
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
  },
}, { _id: false });

// Sub-schema for link properties
const LinkPropertiesSchema = new Schema({
  sharedPhone: String,
  sharedEmail: String,
  sharedAddress: String,
  relationshipType: String,
}, { _id: false });

// Main CrossServiceLink Schema
const CrossServiceLinkSchema = new Schema({
  linkId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['account', 'household', 'business', 'referral', 'transaction'],
  },
  entities: {
    type: [LinkedEntitySchema],
    required: true,
    validate: {
      validator: function(v: any[]) {
        return v.length >= 2;
      },
      message: 'A link must have at least 2 entities',
    },
  },
  properties: {
    type: LinkPropertiesSchema,
    default: () => ({}),
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended', 'terminated'],
    default: 'active',
    index: true,
  },
  verifiedAt: Date,
  verifiedBy: String,
}, {
  timestamps: true,
});

// Compound indexes
CrossServiceLinkSchema.index({ tenantId: 1, type: 1, status: 1 });
CrossServiceLinkSchema.index({ tenantId: 1, 'entities.service': 1, 'entities.entityId': 1 });
CrossServiceLinkSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

// Virtual for services involved in link
CrossServiceLinkSchema.virtual('services').get(function() {
  return [...new Set(this.entities.map((e: any) => e.service))];
});

// Virtual for primary entity
CrossServiceLinkSchema.virtual('primaryEntity').get(function() {
  const primary = this.entities.find((e: any) => e.role === 'primary');
  return primary || this.entities[0];
});

// Virtual for secondary entities
CrossServiceLinkSchema.virtual('secondaryEntities').get(function() {
  return this.entities.filter((e: any) => e.role !== 'primary');
});

// Method to add entity to link
CrossServiceLinkSchema.methods.addEntity = async function(
  service: EcosystemService,
  entityType: string,
  entityId: string,
  role: 'primary' | 'secondary' | 'dependent' = 'secondary',
  metadata?: Record<string, unknown>
) {
  const exists = this.entities.some(
    (e: any) => e.service === service && e.entityId === entityId
  );

  if (exists) {
    throw new Error('Entity already exists in this link');
  }

  // If adding as primary and one exists, demote it
  if (role === 'primary') {
    this.entities.forEach((e: any) => {
      if (e.role === 'primary') e.role = 'secondary';
    });
  }

  this.entities.push({
    service,
    entityType,
    entityId,
    role,
    linkedAt: new Date(),
    metadata,
  });

  await this.save();
  return this;
};

// Method to remove entity from link
CrossServiceLinkSchema.methods.removeEntity = async function(
  service: EcosystemService,
  entityId: string
) {
  const entity = this.entities.find(
    (e: any) => e.service === service && e.entityId === entityId
  );

  if (!entity) {
    throw new Error('Entity not found in this link');
  }

  if (entity.role === 'primary' && this.entities.length > 2) {
    throw new Error('Cannot remove primary entity when more than 2 entities exist');
  }

  this.entities = this.entities.filter(
    (e: any) => !(e.service === service && e.entityId === entityId)
  );

  await this.save();
  return this;
};

// Method to verify link
CrossServiceLinkSchema.methods.verify = async function(verifiedBy: string) {
  this.status = 'active';
  this.verifiedAt = new Date();
  this.verifiedBy = verifiedBy;
  await this.save();
  return this;
};

// Method to suspend link
CrossServiceLinkSchema.methods.suspend = async function(reason?: string) {
  this.status = 'suspended';
  if (reason) {
    this.properties = { ...this.properties.toObject(), suspensionReason: reason };
  }
  await this.save();
  return this;
};

// Method to terminate link
CrossServiceLinkSchema.methods.terminate = async function() {
  this.status = 'terminated';
  await this.save();
  return this;
};

// Static method to create link
CrossServiceLinkSchema.statics.createLink = async function(
  tenantId: string,
  type: 'account' | 'household' | 'business' | 'referral' | 'transaction',
  entities: Array<{
    service: EcosystemService;
    entityType: string;
    entityId: string;
    role?: 'primary' | 'secondary' | 'dependent';
    metadata?: Record<string, unknown>;
  }>,
  properties?: Record<string, string>
) {
  const linkId = `CSL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const link = await this.create({
    linkId,
    tenantId,
    type,
    entities: entities.map(e => ({
      ...e,
      role: e.role || 'primary',
      linkedAt: new Date(),
    })),
    properties: properties || {},
    status: 'pending',
  });

  return link;
};

// Static method to find existing link between entities
CrossServiceLinkSchema.statics.findLinkBetween = async function(
  tenantId: string,
  service1: EcosystemService,
  entityId1: string,
  service2: EcosystemService,
  entityId2: string
) {
  return this.findOne({
    tenantId,
    status: { $ne: 'terminated' },
    entities: {
      $all: [
        { $elemMatch: { service: service1, entityId: entityId1 } },
        { $elemMatch: { service: service2, entityId: entityId2 } },
      ],
    },
  });
};

// Static method to find all links for an entity
CrossServiceLinkSchema.statics.findByEntity = async function(
  tenantId: string,
  service: EcosystemService,
  entityId: string,
  options?: { status?: string; type?: string }
) {
  const query: Record<string, unknown> = {
    tenantId,
    'entities.service': service,
    'entities.entityId': entityId,
  };

  if (options?.status) query.status = options.status;
  if (options?.type) query.type = options.type;

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to find or create household link
CrossServiceLinkSchema.statics.findOrCreateHousehold = async function(
  tenantId: string,
  phone: string,
  entities: Array<{
    service: EcosystemService;
    entityType: string;
    entityId: string;
  }>
) {
  let link = await this.findOne({
    tenantId,
    type: 'household',
    'properties.sharedPhone': phone,
    status: { $ne: 'terminated' },
  });

  if (!link) {
    link = await this.createLink(
      tenantId,
      'household',
      entities,
      { sharedPhone: phone }
    );
  } else {
    // Add new entities to existing household
    for (const entity of entities) {
      const exists = link.entities.some(
        (e: any) => e.service === entity.service && e.entityId === entity.entityId
      );
      if (!exists) {
        await link.addEntity(entity.service, entity.entityType, entity.entityId, 'secondary');
      }
    }
  }

  return link;
};

// Static method to find referral links
CrossServiceLinkSchema.statics.findReferralChain = async function(
  tenantId: string,
  service: EcosystemService,
  entityId: string,
  maxDepth: number = 3
) {
  const chain: any[] = [];
  let currentEntity = { service, entityId };
  let visited = new Set([`${service}:${entityId}`]);

  for (let i = 0; i < maxDepth; i++) {
    const link = await this.findOne({
      tenantId,
      type: 'referral',
      status: 'active',
      entities: {
        $elemMatch: { service: currentEntity.service, entityId: currentEntity.entityId },
      },
    });

    if (!link) break;

    chain.push(link);

    // Find the other entity in the referral chain
    const nextEntity = link.entities.find(
      (e: any) => !(e.service === currentEntity.service && e.entityId === currentEntity.entityId)
    );

    if (!nextEntity || visited.has(`${nextEntity.service}:${nextEntity.entityId}`)) break;

    currentEntity = { service: nextEntity.service, entityId: nextEntity.entityId };
    visited.add(`${currentEntity.service}:${currentEntity.entityId}`);
  }

  return chain;
};

export const CrossServiceLink = mongoose.model('CrossServiceLink', CrossServiceLinkSchema);
