import mongoose, { Schema, Document } from 'mongoose';
import { EntityType } from '../types';

export interface IGraphNode extends Document {
  nodeId: string;
  entityType: EntityType;
  entityId: string;
  name: string;
  properties: Record<string, unknown>;
  labels: string[];
  metadata: {
    source?: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

const GraphNodeSchema = new Schema<IGraphNode>(
  {
    nodeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      enum: [
        'customer', 'order', 'payment', 'product', 'service', 'company',
        'employee', 'vendor', 'location', 'campaign', 'transaction',
        'subscription', 'review', 'inventory', 'agent', 'goal', 'task',
        'document', 'asset', 'event', 'deal', 'lead', 'opportunity',
        'invoice', 'shipment'
      ],
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    properties: {
      type: Schema.Types.Mixed,
      default: {},
    },
    labels: [{
      type: String,
      index: true,
    }],
    metadata: {
      source: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      version: { type: Number, default: 1 },
    },
  },
  {
    timestamps: false,
    collection: 'graph_nodes',
  }
);

// Compound indexes for common queries
GraphNodeSchema.index({ entityType: 1, entityId: 1 }, { unique: true });
GraphNodeSchema.index({ entityType: 1, name: 1 });
GraphNodeSchema.index({ labels: 1, entityType: 1 });

// Text search index
GraphNodeSchema.index({ name: 'text', 'properties.description': 'text' });

// Pre-save middleware to update timestamp
GraphNodeSchema.pre('save', function (next) {
  this.metadata.updatedAt = new Date();
  this.metadata.version += 1;
  next();
});

// Static method to find or create
GraphNodeSchema.statics.findOrCreate = async function (data: {
  entityType: EntityType;
  entityId: string;
  name: string;
  properties?: Record<string, unknown>;
  labels?: string[];
  source?: string;
}) {
  let node = await this.findOne({
    entityType: data.entityType,
    entityId: data.entityId,
  });

  if (!node) {
    node = await this.create({
      nodeId: `${data.entityType}_${data.entityId}`,
      ...data,
      metadata: {
        source: data.source,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      },
    });
  }

  return node;
};

export const GraphNode = mongoose.model<IGraphNode>('GraphNode', GraphNodeSchema);
