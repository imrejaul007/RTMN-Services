/**
 * Company model — Nexha Business Directory (ADR-0009 Phase 3).
 *
 * A Company is the top-level entity in the directory. It owns a
 * set of Agents, exposes a list of capabilities, and may be linked
 * to one or more trust records (SADA trustEntityId values) so the
 * directory can surface trust badges.
 *
 * Tenancy: every record carries `tenantId`. The route layer enforces
 * that callers only see their own tenant unless they're an internal
 * service (via x-internal-token). Cross-tenant search uses the
 * dedicated `/api/v1/capabilities` endpoint, which is read-only and
 * rate-limited.
 */

import mongoose, { Schema, model } from 'mongoose';

const ContactSchema = new Schema(
  {
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    country: { type: String, trim: true },
  },
  { _id: false },
);

const CompanySchema = new Schema(
  {
    companyId: { type: String, required: true, unique: true, index: true },
    tenantId: { type: String, required: true, index: true },

    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, default: null },
    capabilities: { type: [String], default: [], index: true },
    industries: { type: [String], default: [] },

    contact: { type: ContactSchema, default: null },

    // Optional SADA trust entity id; the directory does NOT compute
    // trust itself — it just renders a badge by calling SADA's
    // /public/trust/:trustEntityId endpoint.
    trustEntityId: { type: String, default: null, index: true },

    // Verification level 0..3, populated from SADA.
    verificationLevel: { type: Number, enum: [0, 1, 2, 3], default: 0 },

    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED', 'PENDING_REVIEW'],
      default: 'ACTIVE',
      index: true,
    },

    metadata: { type: Schema.Types.Mixed, default: null },
    agentCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'companies' },
);

// Text index for free-text search across name + description + capabilities.
CompanySchema.index(
  { name: 'text', description: 'text', capabilities: 'text' },
  { name: 'company_text_idx', weights: { name: 5, capabilities: 3, description: 1 } },
);

// Compound index for the most common directory query: by capability + status.
CompanySchema.index({ capabilities: 1, status: 1 });

export const Company = model('Company', CompanySchema);
export default Company;
