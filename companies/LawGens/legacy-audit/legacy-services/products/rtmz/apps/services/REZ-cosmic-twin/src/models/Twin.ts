import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const TwinTypeSchema = z.enum(['company', 'person', 'product', 'location', 'event']);
export type TwinType = z.infer<typeof TwinTypeSchema>;

export const TwinStateSchema = z.record(z.unknown());
export const TwinMetadataSchema = z.record(z.unknown());

export const CreateTwinSchema = z.object({
  type: TwinTypeSchema,
  name: z.string().min(1).max(255),
  state: TwinStateSchema.optional(),
  metadata: TwinMetadataSchema.optional(),
  tenantId: z.string().optional(),
});

export const UpdateTwinSchema = z.object({
  state: TwinStateSchema.optional(),
  metadata: TwinMetadataSchema.optional(),
  name: z.string().min(1).max(255).optional(),
});

export type CreateTwinInput = z.infer<typeof CreateTwinSchema>;
export type UpdateTwinInput = z.infer<typeof UpdateTwinSchema>;

// Mongoose interfaces
export interface ITwin extends Document {
  _id: mongoose.Types.ObjectId;
  twinId: string;
  type: TwinType;
  name: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: number;
  tenantId?: string;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose schema
const TwinSchema = new Schema<ITwin>(
  {
    twinId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['company', 'person', 'product', 'location', 'event'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: Schema.Types.Mixed,
      default: {},
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      default: 1,
    },
    tenantId: {
      type: String,
      index: true,
    },
    lastSync: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
TwinSchema.index({ name: 'text' });
TwinSchema.index({ createdAt: -1 });
TwinSchema.index({ updatedAt: -1 });

export const Twin = mongoose.model<ITwin>('Twin', TwinSchema);

// Response interface for API
export interface TwinResponse {
  id: string;
  type: TwinType;
  name: string;
  state: Record<string, unknown>;
  metadata: Record<string, unknown>;
  version: number;
  lastSync: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toTwinResponse(twin: ITwin): TwinResponse {
  return {
    id: twin.twinId,
    type: twin.type,
    name: twin.name,
    state: twin.state,
    metadata: twin.metadata,
    version: twin.version,
    lastSync: twin.lastSync,
    createdAt: twin.createdAt,
    updatedAt: twin.updatedAt,
  };
}
