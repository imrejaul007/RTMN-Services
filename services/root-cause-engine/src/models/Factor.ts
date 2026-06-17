import mongoose, { Schema, Document } from 'mongoose';
import { ContributingFactor, FactorType, ControlLevel } from '../types';

export interface FactorDocument extends Omit<ContributingFactor, 'id'>, Document {}

const FactorSchema = new Schema<FactorDocument>({
  factorId: {
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
  type: {
    type: String,
    enum: ['process', 'technology', 'human', 'external', 'resource', 'policy'],
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  impact: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  controllability: {
    type: String,
    enum: ['controllable', 'partially_controllable', 'uncontrollable'],
    required: true
  },
  frequency: {
    type: Number,
    default: 1
  },
  affectedComplaints: [{
    type: String
  }],
  recommendations: [{
    type: String
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
FactorSchema.index({ tenantId: 1, type: 1 });
FactorSchema.index({ tenantId: 1, controllability: 1 });
FactorSchema.index({ analysisId: 1 });
FactorSchema.index({ impact: -1 });
FactorSchema.index({ frequency: -1 });

// Compound index for finding similar factors
FactorSchema.index({ tenantId: 1, type: 1, name: 1 });

export const Factor = mongoose.model<FactorDocument>('Factor', FactorSchema);
