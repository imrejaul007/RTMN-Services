/**
 * Agent model — Nexha Business Directory (ADR-0009 Phase 3).
 *
 * Agents are owned by a Company (companyId). They represent a
 * specific AI agent or human-actor twin that the company has
 * registered into the network. Agents carry their own capability
 * list (a subset/superset of the company) and an optional
 * trustEntityId pointing at SADA.
 *
 * The directory is purely a registry — it does not host agent
 * runtime state, only metadata + linkage.
 */

import mongoose, { Schema, model } from 'mongoose';

const AgentSchema = new Schema(
  {
    agentId: { type: String, required: true, unique: true, index: true },
    companyId: { type: String, required: true, index: true },
    tenantId: { type: String, required: true, index: true },

    type: {
      type: String,
      enum: ['AGENT', 'HUMAN', 'HYBRID', 'SERVICE'],
      default: 'AGENT',
    },

    displayName: { type: String, default: null },
    capabilities: { type: [String], default: [], index: true },

    trustEntityId: { type: String, default: null, index: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
      default: 'ACTIVE',
      index: true,
    },

    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true, collection: 'agents' },
);

AgentSchema.index({ companyId: 1, status: 1 });
AgentSchema.index({ capabilities: 1, status: 1 });

export const Agent = model('Agent', AgentSchema);
export default Agent;
