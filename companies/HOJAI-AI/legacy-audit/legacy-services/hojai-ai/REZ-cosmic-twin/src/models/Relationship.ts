import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const RelationshipTypeSchema = z.enum([
  'owns',
  'manages',
  'works_for',
  'sells_to',
  'buys_from',
  'partners_with',
  'invests_in',
  'subsidiary_of',
  'parent_of',
  'related_to',
]);

export const RelationshipZodSchema = z.object({
  targetId: z.string(),
  targetType: z.string(),
  type: RelationshipTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const CreateRelationshipZodSchema = z.object({
  targetId: z.string(),
  targetType: z.string(),
  type: RelationshipTypeSchema,
  metadata: z.record(z.unknown()).optional(),
});

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;
export type CreateRelationshipInput = z.infer<typeof CreateRelationshipZodSchema>;

// Mongoose interface
export interface IRelationship extends Document {
  _id: mongoose.Types.ObjectId;
  relationshipId: string;
  sourceTwinId: string;
  targetTwinId: string;
  targetType: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema
const RelationshipMongooseSchema = new Schema<IRelationship>(
  {
    relationshipId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sourceTwinId: {
      type: String,
      required: true,
      index: true,
    },
    targetTwinId: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        'owns',
        'manages',
        'works_for',
        'sells_to',
        'buys_from',
        'partners_with',
        'invests_in',
        'subsidiary_of',
        'parent_of',
        'related_to',
      ],
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
RelationshipMongooseSchema.index({ sourceTwinId: 1, targetTwinId: 1 }, { unique: true });
RelationshipMongooseSchema.index({ sourceTwinId: 1, type: 1 });
RelationshipMongooseSchema.index({ targetTwinId: 1, type: 1 });

export const Relationship = mongoose.model<IRelationship>('Relationship', RelationshipMongooseSchema);

// Response interface
export interface RelationshipResponse {
  id: string;
  sourceTwinId: string;
  targetTwinId: string;
  targetType: string;
  type: RelationshipType;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export function toRelationshipResponse(relationship: IRelationship): RelationshipResponse {
  return {
    id: relationship.relationshipId,
    sourceTwinId: relationship.sourceTwinId,
    targetTwinId: relationship.targetTwinId,
    targetType: relationship.targetType,
    type: relationship.type,
    metadata: relationship.metadata,
    createdAt: relationship.createdAt,
  };
}

// Extended twin with relationships for API response
export interface TwinWithRelationships {
  twin: import('./Twin.js').TwinResponse;
  relationships: RelationshipResponse[];
  incomingRelationships: RelationshipResponse[];
}
