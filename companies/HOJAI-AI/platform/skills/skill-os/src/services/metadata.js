/**
 * SkillOS — Rich metadata for assets
 *
 * The "App Store for AI" data model needs ~20 fields per asset (per the
 * long-term vision). This module:
 *   - Defines all 20 fields
 *   - Provides defaults
 *   - Validates user input
 *   - Backfills defaults for legacy records on read
 *
 * Backward compatible: legacy records (created before the field set was
 * expanded) read back with the new fields filled in with defaults.
 */

export const ASSET_TYPES = [
  'skill',             // atomic capability
  'agent-template',    // complete AI employee
  'workflow-template', // business process
  'prompt-pack',       // collection of prompts
  'knowledge-pack',    // domain knowledge (ICD codes, GST rules, etc.)
  'tool-connector',    // external service adapter
  'model-adapter',     // wraps an external model
  'automation-pack',   // bundled automations
  'industry-pack',     // vertical-specific bundle
  'enterprise-pack',   // org-wide bundle
  'pack',              // collection of assets installed together
];

export const VISIBILITY = ['public', 'private', 'org-only'];

export const OWNER_TYPES = ['human', 'agent', 'organization', 'personal'];

/**
 * Default metadata block. Used for legacy record backfill and new records.
 */
export function defaultMetadata() {
  return {
    // Identity & ownership
    creatorId: null,
    publisher: null,            // 'HOJAI Official' | 'Community' | 'Microsoft' | ...
    ownerType: null,            // 'human' | 'agent' | 'organization' | 'personal'
    ownerId: null,              // CorpID of owner

    // I/O contracts
    inputSchema: null,          // JSON Schema for input
    outputSchema: null,         // JSON Schema for output

    // Capability
    requiredModels: [],         // ['gpt-4o', 'claude-opus-4-8']
    requiredPermissions: [],    // explicit capability permissions

    // Reach
    supportedLanguages: ['en'],
    supportedIndustries: [],    // ['restaurant', 'healthcare', 'finance', ...]

    // Commercial
    license: 'MIT',
    pricingModel: 'free',       // 'free' | 'one-time' | 'subscription' | 'usage'
    price: 0,
    currency: 'USD',

    // Trust & certification
    certification: { level: 'community', certifiedAt: null, certifiedBy: null, auditRef: null, notes: '' },
    compliance: { gdpr: false, soc2: false, hipaa: false, pci: false, iso27001: false, fedramp: false },

    // Visibility
    visibility: 'public',       // 'public' | 'private' | 'org-only'
    visibilityOrg: null,        // for org-only: which org can see it
    tenantId: null,             // null = global; else per-company scoping

    // Lifecycle
    status: 'active',           // 'draft' | 'active' | 'deprecated' | 'sunset' | 'retired'
    deprecatedAt: null,
    sunsetAt: null,
    replacement: null,

    // Metrics (rolled up from analytics)
    avgExecutionMs: 0,
    accuracyScore: null,        // 0.0-1.0 from learning feedback
    totalDownloads: 0,
    totalExecutions: 0,
    totalRevenue: 0,

    // Discovery
    featured: false,
    trending: false,
  };
}

/**
 * Backfill missing metadata fields with defaults.
 * Idempotent — safe to call on legacy records.
 */
export function fillMetadata(asset) {
  if (!asset) return asset;
  const defaults = defaultMetadata();
  for (const k of Object.keys(defaults)) {
    if (!(k in asset) || asset[k] === undefined) {
      asset[k] = defaults[k];
    }
  }
  // Also ensure nested objects are filled
  if (!asset.certification || typeof asset.certification !== 'object') {
    asset.certification = defaults.certification;
  }
  if (!asset.compliance || typeof asset.compliance !== 'object') {
    asset.compliance = defaults.compliance;
  }
  return asset;
}

/**
 * Validate a metadata payload. Throws on hard errors; soft-warns on oddities.
 */
export function validateMetadata(input) {
  if (input.assetType && !ASSET_TYPES.includes(input.assetType)) {
    throw new Error(`invalid assetType: ${input.assetType}. Must be one of: ${ASSET_TYPES.join(', ')}`);
  }
  if (input.visibility && !VISIBILITY.includes(input.visibility)) {
    throw new Error(`invalid visibility: ${input.visibility}. Must be one of: ${VISIBILITY.join(', ')}`);
  }
  if (input.ownerType && !OWNER_TYPES.includes(input.ownerType)) {
    throw new Error(`invalid ownerType: ${input.ownerType}. Must be one of: ${OWNER_TYPES.join(', ')}`);
  }
  if (input.pricingModel && !['free', 'one-time', 'subscription', 'usage'].includes(input.pricingModel)) {
    throw new Error(`invalid pricingModel: ${input.pricingModel}`);
  }
  if (input.price !== undefined && (Number.isNaN(Number(input.price)) || Number(input.price) < 0)) {
    throw new Error(`price must be a non-negative number`);
  }
  if (input.supportedLanguages && !Array.isArray(input.supportedLanguages)) {
    throw new Error(`supportedLanguages must be an array`);
  }
  if (input.requiredModels && !Array.isArray(input.requiredModels)) {
    throw new Error(`requiredModels must be an array`);
  }
}
