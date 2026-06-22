import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

// Zod validation schemas
export const TwinEventActionSchema = z.enum([
  'create',
  'update',
  'delete',
  'restore',
  'snapshot_created',
  'snapshot_restored',
  'relationship_added',
  'relationship_removed',
  'state_transition',
]);

export const TwinEventZodSchema = z.object({
  timestamp: z.date().or(z.string().datetime()),
  action: TwinEventActionSchema,
  previousState: z.record(z.unknown()).nullable(),
  newState: z.record(z.unknown()).nullable(),
  source: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const CreateEventZodSchema = z.object({
  twinId: z.string(),
  action: TwinEventActionSchema,
  previousState: z.record(z.unknown()).nullable().optional(),
  newState: z.record(z.unknown()).nullable().optional(),
  source: z.string().default('system'),
  metadata: z.record(z.unknown()).optional(),
});

export type TwinEventAction = z.infer<typeof TwinEventActionSchema>;
export type CreateEventInput = z.infer<typeof CreateEventZodSchema>;

// Mongoose interface
export interface ITwinEvent extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: string;
  twinId: string;
  action: TwinEventAction;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  source: string;
  metadata?: Record<string, unknown>;
  version: number;
  timestamp: Date;
  createdAt: Date;
}

// Mongoose schema
const TwinEventMongooseSchema = new Schema<ITwinEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    twinId: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'restore',
        'snapshot_created',
        'snapshot_restored',
        'relationship_added',
        'relationship_removed',
        'state_transition',
      ],
    },
    previousState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    source: {
      type: String,
      default: 'system',
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    version: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound indexes for efficient queries
TwinEventMongooseSchema.index({ twinId: 1, timestamp: -1 });
TwinEventMongooseSchema.index({ twinId: 1, version: -1 });
TwinEventMongooseSchema.index({ twinId: 1, action: 1, timestamp: -1 });

export const TwinEvent = mongoose.model<ITwinEvent>('TwinEvent', TwinEventMongooseSchema);

// Response interface
export interface TwinEventResponse {
  id: string;
  twinId: string;
  action: TwinEventAction;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  source: string;
  metadata?: Record<string, unknown>;
  version: number;
  timestamp: Date;
}

export function toEventResponse(event: ITwinEvent): TwinEventResponse {
  return {
    id: event.eventId,
    twinId: event.twinId,
    action: event.action,
    previousState: event.previousState,
    newState: event.newState,
    source: event.source,
    metadata: event.metadata,
    version: event.version,
    timestamp: event.timestamp,
  };
}
