/**
 * Directory Service — business logic for nexha-business-directory.
 *
 * Exposes a small, well-tested surface that the route layer calls:
 *   - registerCompany, getCompany, listCompanies, updateCompany
 *   - registerAgent, getAgent, listAgents, listCompanyAgents
 *   - searchCapabilities (read-only public search)
 *
 * Tenant isolation: every write must include tenantId. Reads
 * enforce tenantId unless the caller is internal (the route layer
 * resolves this from the auth context before calling).
 *
 * Idempotency:
 *   - registerCompany is idempotent on (tenantId, name).
 *   - registerAgent is idempotent on agentId.
 *   - Updates merge rather than overwrite metadata keys.
 */

import { v4 as uuid } from 'uuid';
import { Company } from '../models/Company.js';
import { Agent } from '../models/Agent.js';

const SUPPORTED_AGENT_TYPES = new Set(['AGENT', 'HUMAN', 'HYBRID', 'SERVICE']);

function normaliseCapabilities(input) {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(
      input
        .filter((c) => typeof c === 'string')
        .map((c) => c.trim().toLowerCase())
        .filter(Boolean),
    ),
  ).slice(0, 50);
}

function makeCompanyId() {
  return `co-${uuid()}`;
}

function makeAgentId() {
  return `ag-${uuid()}`;
}

function trim(value, max = 2000) {
  if (typeof value !== 'string') return value;
  return value.trim().slice(0, max);
}

// ─────────────────────────────────────────────────────────────────
// Companies
// ─────────────────────────────────────────────────────────────────

/**
 * Create or update a company by (tenantId, name). Idempotent.
 * Returns the persisted record.
 */
export async function registerCompany(input) {
  if (!input || !input.tenantId || !input.name) {
    const err = new Error('tenantId and name are required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const tenantId = trim(input.tenantId, 200);
  const name = trim(input.name, 200);
  if (!tenantId || !name) {
    const err = new Error('tenantId and name are required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const update = {
    description: trim(input.description, 4000) || null,
    capabilities: normaliseCapabilities(input.capabilities),
    industries: normaliseCapabilities(input.industries),
    contact: input.contact && typeof input.contact === 'object' ? input.contact : null,
    trustEntityId: trim(input.trustEntityId, 200) || null,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : null,
    status: input.status || 'ACTIVE',
  };

  const company = await Company.findOneAndUpdate(
    { tenantId, name },
    { $set: update, $setOnInsert: { companyId: makeCompanyId(), tenantId, name } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  return company;
}

export async function getCompany(companyId) {
  if (!companyId) return null;
  return Company.findOne({ companyId }).lean();
}

export async function getCompanyByTenantAndName(tenantId, name) {
  if (!tenantId || !name) return null;
  return Company.findOne({ tenantId, name }).lean();
}

/**
 * List companies. If `tenantId` is provided, scopes to that tenant.
 * Otherwise returns ACTIVE companies across tenants (used for public
 * directory browse — the route layer applies rate limits).
 */
export async function listCompanies({ tenantId, status = 'ACTIVE', limit = 50, offset = 0 } = {}) {
  const filter = {};
  if (tenantId) filter.tenantId = tenantId;
  if (status) filter.status = status;

  const cappedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  const cappedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const [items, total] = await Promise.all([
    Company.find(filter).sort({ updatedAt: -1 }).skip(cappedOffset).limit(cappedLimit).lean(),
    Company.countDocuments(filter),
  ]);

  return { items, total, limit: cappedLimit, offset: cappedOffset };
}

export async function updateCompany(companyId, tenantId, patch) {
  if (!companyId || !tenantId) return null;
  const allowed = {};
  for (const k of ['description', 'contact', 'trustEntityId', 'verificationLevel', 'status', 'metadata']) {
    if (k in patch) allowed[k] = patch[k];
  }
  if ('capabilities' in patch) allowed.capabilities = normaliseCapabilities(patch.capabilities);
  if ('industries' in patch) allowed.industries = normaliseCapabilities(patch.industries);

  return Company.findOneAndUpdate(
    { companyId, tenantId },
    { $set: allowed },
    { new: true, runValidators: true },
  ).lean();
}

export async function deleteCompany(companyId, tenantId) {
  if (!companyId || !tenantId) return false;
  const res = await Company.deleteOne({ companyId, tenantId });
  if (res.deletedCount > 0) {
    // Cascade: remove all agents belonging to this company.
    await Agent.deleteMany({ companyId, tenantId });
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────
// Agents
// ─────────────────────────────────────────────────────────────────

export async function registerAgent(companyId, input) {
  if (!companyId) {
    const err = new Error('companyId is required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (!input || !input.agentId || !input.tenantId) {
    const err = new Error('tenantId and agentId are required');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const agentType = SUPPORTED_AGENT_TYPES.has(input.type) ? input.type : 'AGENT';

  const company = await Company.findOne({ companyId }).lean();
  if (!company) {
    const err = new Error(`Company ${companyId} not found`);
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (company.tenantId !== input.tenantId) {
    const err = new Error('tenantId mismatch with parent company');
    err.code = 'FORBIDDEN';
    throw err;
  }

  const update = {
    companyId,
    tenantId: input.tenantId,
    type: agentType,
    displayName: trim(input.displayName, 200) || null,
    capabilities: normaliseCapabilities(input.capabilities),
    trustEntityId: trim(input.trustEntityId, 200) || null,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : null,
    status: input.status || 'ACTIVE',
  };

  const agent = await Agent.findOneAndUpdate(
    { agentId: input.agentId },
    { $set: update, $setOnInsert: { agentId: input.agentId } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  // Maintain the denormalised agent count.
  await Company.updateOne(
    { companyId },
    { $set: { agentCount: await Agent.countDocuments({ companyId }) } },
  );

  return agent;
}

export async function getAgent(agentId) {
  if (!agentId) return null;
  return Agent.findOne({ agentId }).lean();
}

export async function listCompanyAgents(companyId, { status = null, limit = 50, offset = 0 } = {}) {
  const filter = { companyId };
  if (status) filter.status = status;
  const cappedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  const cappedOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [items, total] = await Promise.all([
    Agent.find(filter).sort({ updatedAt: -1 }).skip(cappedOffset).limit(cappedLimit).lean(),
    Agent.countDocuments(filter),
  ]);
  return { items, total, limit: cappedLimit, offset: cappedOffset };
}

export async function listAgents({ tenantId, capability = null, limit = 50, offset = 0 } = {}) {
  const filter = { status: 'ACTIVE' };
  if (tenantId) filter.tenantId = tenantId;
  if (capability) filter.capabilities = capability.toLowerCase();
  const cappedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 200));
  const cappedOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [items, total] = await Promise.all([
    Agent.find(filter).sort({ updatedAt: -1 }).skip(cappedOffset).limit(cappedLimit).lean(),
    Agent.countDocuments(filter),
  ]);
  return { items, total, limit: cappedLimit, offset: cappedOffset };
}

// ─────────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────────

/**
 * Public capability search. Returns companies that have at least one
 * of the requested capabilities. Optionally narrows by free-text
 * query against name + description.
 */
export async function searchCapabilities({ q = null, capabilities = [], limit = 50, offset = 0 } = {}) {
  const filter = { status: 'ACTIVE' };
  if (Array.isArray(capabilities) && capabilities.length > 0) {
    filter.capabilities = { $in: capabilities.map((c) => c.toLowerCase()) };
  }
  if (q && typeof q === 'string' && q.trim()) {
    filter.$or = [
      { name: { $regex: q.trim(), $options: 'i' } },
      { description: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  const cappedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
  const cappedOffset = Math.max(0, parseInt(offset, 10) || 0);

  const [items, total] = await Promise.all([
    Company.find(filter).sort({ updatedAt: -1 }).skip(cappedOffset).limit(cappedLimit).lean(),
    Company.countDocuments(filter),
  ]);
  return { items, total, limit: cappedLimit, offset: cappedOffset };
}

/**
 * Resolve trust badges for a list of companyIds by looking up the
 * trustEntityId on each. Returns an object keyed by companyId —
 * the route layer can use this to enrich the public response.
 */
export async function getTrustLinkage(companyIds) {
  if (!Array.isArray(companyIds) || companyIds.length === 0) return {};
  const docs = await Company.find({ companyId: { $in: companyIds } })
    .select({ companyId: 1, trustEntityId: 1, verificationLevel: 1 })
    .lean();
  const out = {};
  for (const d of docs) {
    out[d.companyId] = {
      trustEntityId: d.trustEntityId || null,
      verificationLevel: d.verificationLevel ?? 0,
    };
  }
  return out;
}

// ───────────────────────��─────────────────────────────────────────
// Internal — seeding for local dev / smoke tests
// ─────────────────────────────────────────────────────────────────

export async function seedDemoCompanies() {
  const seeds = [
    {
      tenantId: 'demo-tenant',
      name: 'Acme Suppliers',
      description: 'Generic goods supplier with global reach.',
      capabilities: ['logistics', 'wholesale', 'import'],
      industries: ['retail', 'hospitality'],
    },
    {
      tenantId: 'demo-tenant',
      name: 'Bengaluru Logistics Co',
      description: 'Last-mile delivery specialists in Bengaluru.',
      capabilities: ['logistics', 'delivery', 'warehousing'],
      industries: ['retail'],
    },
    {
      tenantId: 'demo-tenant',
      name: 'Mumbai Spice Traders',
      description: 'Bulk spice importer for restaurants and hotels.',
      capabilities: ['wholesale', 'restaurant_supply', 'import'],
      industries: ['hospitality'],
    },
  ];
  for (const s of seeds) {
    await registerCompany(s);
  }
  return seeds.length;
}
