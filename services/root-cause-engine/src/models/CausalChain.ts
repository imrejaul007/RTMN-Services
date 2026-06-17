import mongoose, { Schema, Document } from 'mongoose';
import { CausalChain, CausalNode, ChainLevel, ConfidenceLevel } from '../types';

export interface CausalChainDocument extends Omit<CausalChain, 'id'>, Document {}

const FactorContributionSchema = new Schema({
  factorId: { type: String, required: true },
  factorName: { type: String, required: true },
  contribution: { type: Number, required: true, min: 0, max: 100 },
  controllable: {
    type: String,
    enum: ['controllable', 'partially_controllable', 'uncontrollable'],
    required: true
  }
}, { _id: false });

const CausalNodeSchema = new Schema({
  id: { type: String, required: true },
  level: {
    type: String,
    enum: ['symptom', 'issue', 'cause', 'root_cause'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String, required: true },
  confidence: {
    type: String,
    enum: ['high', 'medium', 'low'],
    required: true
  },
  evidence: [{
    type: String
  }],
  relatedComplaints: [{
    type: String
  }],
  factorContributions: [FactorContributionSchema]
}, { _id: false });

const CausalChainSchema = new Schema<CausalChainDocument>({
  causalChainId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  analysisId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  nodes: [CausalNodeSchema],
  chainStrength: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  primaryRootCause: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes
CausalChainSchema.index({ tenantId: 1, createdAt: -1 });
CausalChainSchema.index({ analysisId: 1 });
CausalChainSchema.index({ primaryRootCause: 'text' });

export const CausalChainModel = mongoose.model<CausalChainDocument>('CausalChain', CausalChainSchema);
