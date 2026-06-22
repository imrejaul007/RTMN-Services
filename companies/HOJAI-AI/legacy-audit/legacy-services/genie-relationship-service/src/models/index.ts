/**
 * GENIE Relationship Service - MongoDB Models
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Personal relationship tracking for GENIE Personal Intelligence OS
 */

import mongoose, { Schema, Document, Model, HydratedDocument } from 'mongoose';
import { RelationshipType, InteractionType } from '../types.js';

// ============================================================================
// Relationship Model
// ============================================================================

// Base interface for relationship data
interface RelationshipBase {
  user_id: string;
  tenant_id: string;
  name: string;
  relationship_type: RelationshipType;
  importance_score: number;
  last_interaction: string;
  next_followup?: string;
  birthday?: string;
  tags: string[];
  notes: string;
  context: string[];
}

// Document interface (for Mongoose operations)
export interface IRelationship extends RelationshipBase, Document {
  created_at: Date;
  updated_at: Date;
}

// Plain object interface (for lean() queries)
export interface RelationshipPlain extends RelationshipBase {
  _id: mongoose.Types.ObjectId;
  created_at: Date;
  updated_at: Date;
  __v?: number;
}

const RelationshipSchema = new Schema<IRelationship>(
  {
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    tenant_id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true,
    },
    relationship_type: {
      type: String,
      enum: ['family', 'friend', 'colleague', 'client', 'professional'],
      required: true,
      index: true,
    },
    importance_score: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 5,
      index: true,
    },
    last_interaction: {
      type: String,
      required: true,
      default: () => new Date().toISOString(),
    },
    next_followup: {
      type: String,
      default: null,
    },
    birthday: {
      type: String,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    notes: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    context: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'relationships',
  }
);

// Compound indexes for common queries
RelationshipSchema.index({ tenant_id: 1, user_id: 1 });
RelationshipSchema.index({ tenant_id: 1, relationship_type: 1 });
RelationshipSchema.index({ tenant_id: 1, importance_score: -1 });
RelationshipSchema.index({ tenant_id: 1, next_followup: 1 });
RelationshipSchema.index({ tenant_id: 1, user_id: 1, name: 'text' });

export const RelationshipModel: Model<IRelationship> = mongoose.model<IRelationship>(
  'Relationship',
  RelationshipSchema
);

// ============================================================================
// Interaction Model
// ============================================================================

// Base interface for interaction data
interface InteractionBase {
  relationship_id: string;
  tenant_id: string;
  user_id: string;
  type: InteractionType;
  description: string;
  timestamp: string;
}

// Document interface
export interface IInteraction extends InteractionBase, Document {}

// Plain object interface (for lean() queries)
export interface InteractionPlain extends InteractionBase {
  _id: mongoose.Types.ObjectId;
  __v?: number;
}

const InteractionSchema = new Schema<IInteraction>(
  {
    relationship_id: {
      type: String,
      required: true,
      index: true,
    },
    tenant_id: {
      type: String,
      required: true,
      index: true,
    },
    user_id: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['call', 'message', 'meeting', 'email', 'note'],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    timestamp: {
      type: String,
      required: true,
      default: () => new Date().toISOString(),
      index: true,
    },
  },
  {
    timestamps: false,
    collection: 'interactions',
  }
);

// Compound indexes for common queries
InteractionSchema.index({ relationship_id: 1, timestamp: -1 });
InteractionSchema.index({ tenant_id: 1, user_id: 1, timestamp: -1 });
InteractionSchema.index({ tenant_id: 1, user_id: 1, type: 1 });

export const InteractionModel: Model<IInteraction> = mongoose.model<IInteraction>(
  'Interaction',
  InteractionSchema
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get or create relationship
 */
export async function findOrCreateRelationship(
  tenantId: string,
  userId: string,
  name: string,
  relationshipType: RelationshipType
): Promise<HydratedDocument<IRelationship>> {
  let relationship = await RelationshipModel.findOne({
    tenant_id: tenantId,
    user_id: userId,
    name,
    relationship_type: relationshipType,
  });

  if (!relationship) {
    relationship = await RelationshipModel.create({
      tenant_id: tenantId,
      user_id: userId,
      name,
      relationship_type: relationshipType,
      importance_score: 5,
      last_interaction: new Date().toISOString(),
    });
  }

  return relationship;
}

/**
 * Update last interaction timestamp
 */
export async function updateLastInteraction(
  relationshipId: string
): Promise<void> {
  await RelationshipModel.findByIdAndUpdate(relationshipId, {
    last_interaction: new Date().toISOString(),
  });
}
