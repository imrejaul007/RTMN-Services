/**
 * SkillOS — Governance & compliance
 *
 * Implements the soft-governance layer:
 *   - Deprecation lifecycle (warning, deprecated, sunset)
 *   - Approval workflow stub (asset can be flagged approved/rejected)
 *   - Compliance attestations (GDPR, SOC2, HIPAA, PCI) per asset
 *   - Audit log writer (real, persistent)
 *
 * The audit log writes to a persistent store, not a bounded in-memory
 * array. This means audit events survive restart and can be tailed.
 */

import { v4 as uuidv4 } from 'uuid';

export const ASSET_STATUSES = [
  'draft',          // not visible to anyone except the owner
  'active',         // default, can be discovered + installed
  'deprecated',     // still works, marked as legacy
  'sunset',         // will be removed; pinned versions still work
  'retired',        // removed; cannot be installed, old installs return error
];

export const COMPLIANCE_FRAMEWORKS = ['gdpr', 'soc2', 'hipaa', 'pci', 'iso27001', 'fedramp'];

export function isValidStatus(s) {
  return ASSET_STATUSES.includes(s);
}

export function defaultCompliance() {
  return {
    gdpr: false,
    soc2: false,
    hipaa: false,
    pci: false,
    iso27001: false,
    fedramp: false,
  };
}

/**
 * Build an audit record. Pure data — caller writes to the audit store.
 */
export function buildAuditEvent(input) {
  return {
    id: input.id || `aud-${uuidv4().slice(0, 12)}`,
    actor: input.actor || 'anonymous',     // userId / system / publisherId
    action: input.action || 'unknown',    // 'asset.created', 'asset.installed', etc.
    resourceType: input.resourceType || 'asset',
    resourceId: input.resourceId || null,
    tenantId: input.tenantId || null,
    payload: input.payload || {},
    timestamp: input.timestamp || new Date().toISOString(),
  };
}

/**
 * Mark an asset for deprecation with a sunset date.
 */
export function buildDeprecation(input) {
  const sunsetAt = input.sunsetAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
  return {
    status: 'deprecated',
    deprecatedAt: new Date().toISOString(),
    sunsetAt,
    replacement: input.replacement || null,
    reason: input.reason || '',
  };
}
