import mongoose, { Schema, Document } from 'mongoose';
import { EdgeType } from '../types';

export interface IGraphEdge extends Document {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  properties: Record<string, unknown>;
  weight: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    source?: string;
  };
}

const GraphEdgeSchema = new Schema<IGraphEdge>(
  {
    edgeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    sourceNodeId: {
      type: String,
      required: true,
      index: true,
    },
    targetNodeId: {
      type: String,
      required: true,
      index: true,
    },
    edgeType: {
      type: String,
      required: true,
      enum: [
        'owns', 'purchased', 'paid', 'shipped', 'contains', 'references',
        'belongs_to', 'managed_by', 'works_at', 'referred_by', 'depends_on',
        'related_to', 'similar_to', 'competes_with', 'partners_with',
        'invested_in', 'approved', 'rejected', 'created', 'updated', 'deleted'
      ],
      index: true,
    },
    properties: {
      type: Schema.Types.Mixed,
      default: {},
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
      max: 1,
    },
    metadata: {
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
      source: String,
    },
  },
  {
    timestamps: false,
    collection: 'graph_edges',
  }
);

// Compound indexes for relationship queries
GraphEdgeSchema.index({ sourceNodeId: 1, targetNodeId: 1 }, { unique: true });
GraphEdgeSchema.index({ sourceNodeId: 1, edgeType: 1 });
GraphEdgeSchema.index({ targetNodeId: 1, edgeType: 1 });
GraphEdgeSchema.index({ edgeType: 1, weight: 1 });

// Pre-save middleware to update timestamp
GraphEdgeSchema.pre('save', function (next) {
  this.metadata.updatedAt = new Date();
  next();
});

// Static method to find or create edge
GraphEdgeSchema.statics.findOrCreate = async function (data: {
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: EdgeType;
  properties?: Record<string, unknown>;
  weight?: number;
  source?: string;
}) {
  const edgeId = `${data.sourceNodeId}_${data.edgeType}_${data.targetNodeId}`;

  let edge = await this.findOne({
    sourceNodeId: data.sourceNodeId,
    targetNodeId: data.targetNodeId,
    edgeType: data.edgeType,
  });

  if (!edge) {
    edge = await this.create({
      edgeId,
      ...data,
      metadata: {
        source: data.source,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  return edge;
};

// Static method to get all edges for a node (incoming and outgoing)
GraphEdgeSchema.statics.getEdgesForNode = async function (nodeId: string) {
  return this.find({
    $or: [
      { sourceNodeId: nodeId },
      { targetNodeId: nodeId },
    ],
  });
};

// Static method to get neighbors
GraphEdgeSchema.statics.getNeighbors = async function (nodeId: string) {
  const outgoing = await this.find({ sourceNodeId: nodeId });
  const incoming = await this.find({ targetNodeId: nodeId });

  return {
    outgoing: outgoing.map(e => ({
      nodeId: e.targetNodeId,
      edge: e,
    })),
    incoming: incoming.map(e => ({
      nodeId: e.sourceNodeId,
      edge: e,
    })),
  };
};

export const GraphEdge = mongoose.model<IGraphEdge>('GraphEdge', GraphEdgeSchema);
