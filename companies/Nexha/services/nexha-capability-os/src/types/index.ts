/**
 * CapabilityOS — Type definitions
 *
 * A capability is anything a Nexha offers to the federation:
 * skills, services, products, agents, data feeds, etc.
 */

/** Top-level categories of capabilities a Nexha can offer. */
export type CapabilityCategory =
  | 'skill'           // executable SkillOS skill
  | 'service'         // B2B service (consulting, fulfillment, support)
  | 'product'         // tangible good or SKU
  | 'agent'           // SUTAR agent that can be invoked cross-Nexha
  | 'data'            // data feed (prices, inventory, ratings)
  | 'workflow'        // multi-step workflow template
  | 'integration'     // connector to external API (CRM, ERP, etc.)
  | 'content';        // content (article, video, course)

/** Capability shape — what a Nexha offers. */
export interface Capability {
  id: string;
  /** Owning Nexha (federation participant) */
  nexhaId: string;
  /** Owning entity within the Nexha (optional) */
  ownerId?: string;
  /** Display name */
  name: string;
  /** Short description (1-2 sentences) */
  description: string;
  /** Long description (markdown OK) */
  longDescription?: string;
  /** Category */
  category: CapabilityCategory;
  /** Tags for matching */
  tags: string[];
  /** Pricing model */
  pricing: {
    model: 'free' | 'per-call' | 'per-hour' | 'per-transaction' | 'subscription' | 'quote';
    amount?: number;
    currency?: string;
    unit?: string;
  };
  /** Trust signals */
  trust: {
    verified: boolean;
    kycLevel: 'none' | 'basic' | 'full';
    insurance?: number;
  };
  /** Geographic coverage (ISO country codes) */
  regions: string[];
  /** Languages supported (ISO 639-1 codes) */
  languages: string[];
  /** SLA — expected response time in ms */
  slaMs?: number;
  /** Status */
  status: 'active' | 'draft' | 'deprecated';
  /** Created / updated */
  createdAt: string;
  updatedAt: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
}

/** Capability query — what a consumer needs. */
export interface CapabilityQuery {
  /** Free-text search */
  q?: string;
  /** Filter by category */
  category?: CapabilityCategory;
  /** Filter by tags (must have ALL) */
  tags?: string[];
  /** Filter by Nexha */
  nexhaId?: string;
  /** Filter by region */
  region?: string;
  /** Filter by language */
  language?: string;
  /** Max price (when pricing.amount is set) */
  maxPrice?: number;
  /** Currency for maxPrice */
  currency?: string;
  /** Only verified */
  verifiedOnly?: boolean;
  /** Min trust level (numeric score 0-100, if computed externally) */
  minTrust?: number;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/** Capability match result. */
export interface CapabilityMatch {
  capability: Capability;
  /** Match score 0-1 (higher = better match) */
  score: number;
  /** Why this matched (for explainability) */
  reasons: string[];
}

/** Search response. */
export interface CapabilitySearchResult {
  matches: CapabilityMatch[];
  total: number;
  query: CapabilityQuery;
  took_ms: number;
}

/** Statistics for a Nexha's capability catalog. */
export interface NexhaCapabilityStats {
  nexhaId: string;
  totalCapabilities: number;
  byCategory: Record<CapabilityCategory, number>;
  byStatus: Record<Capability['status'], number>;
  verifiedCount: number;
  lastUpdated?: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  capabilities: number;
  timestamp: string;
}

// ──────────────────────────────────────────────────────────────────────
// Verifiable Credentials (v1.1 — CapabilityOS)
// ──────────────────────────────────────────────────────────────────────

/** Attestation claim types — what an attester is vouching for */
export type AttestationClaimType =
  | 'identity'        // "this Nexha exists and is who they say"
  | 'capability'      // "this capability works as described"
  | 'compliance'      // "this Nexha meets compliance standard X"
  | 'certification'   // "this Nexha has certification X"
  | 'insurance'       // "this Nexha has insurance coverage X"
  | 'audit'           // "this Nexha passed audit X"
  | 'kyc'             // "this Nexha completed KYB/KYC"
  | 'performance';     // "this Nexha delivers SLA X% of the time"

/** Attestation level — how rigorous the verification was */
export type AttestationLevel =
  | 'self'    // Self-asserted (lowest trust)
  | 'peer'    // Verified by a peer Nexha
  | 'audit'   // Verified by an independent auditor
  | 'certified'; // Formally certified by an authority

/**
 * A verifiable credential attestation on a capability.
 * Signed by an attester (issuer) using HMAC-SHA256.
 * Anyone with the attester's public key can verify the signature.
 */
export interface Attestation {
  /** Unique ID for this attestation */
  attestationId: string;
  /** ID of the capability being attested */
  capabilityId: string;
  /** CorpID of the issuer (attester) */
  issuerId: string;
  /** Human-readable issuer name */
  issuerName: string;
  /** Type of claim being attested */
  claimType: AttestationClaimType;
  /** Attestation level (rigor of verification) */
  level: AttestationLevel;
  /** Free-form claim value e.g. "ISO 9001:2015" or "99.5% uptime SLA" */
  claim: string;
  /** ISO 8601 expiry date */
  expiresAt?: string;
  /** Optional evidence URL (audit report, certificate PDF, etc.) */
  evidenceUrl?: string;
  /** When this attestation was issued */
  issuedAt: string;
  /** HMAC-SHA256 signature: issuerId|capabilityId|claimType|claim|issuedAt */
  signature: string;
}

/** Input for creating a new attestation */
export interface AttestationInput {
  capabilityId: string;
  issuerId: string;
  issuerName: string;
  claimType: AttestationClaimType;
  level: AttestationLevel;
  claim: string;
  expiresAt?: string;
  evidenceUrl?: string;
  /** HMAC secret for signing. Defaults to ATTESTATION_SECRET env var. */
  secret?: string;
}

/** Response from attest endpoint */
export interface AttestationResult {
  attestation: Attestation;
  verificationUrl: string;
  qrCodeData?: string;
}

/** Response from verify endpoint */
export interface VerificationResult {
  valid: boolean;
  reason?: string;
  attestation?: Attestation;
  expired?: boolean;
  tampered?: boolean;
}

/** Attestation summary for a capability */
export interface AttestationSummary {
  capabilityId: string;
  attestationCount: number;
  byLevel: Record<AttestationLevel, number>;
  byClaimType: Record<AttestationClaimType, number>;
  highestLevel: AttestationLevel;
  isSelfAttested: boolean;
  attestations: Attestation[];
}