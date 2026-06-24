/**
 * FederationOS — Type definitions
 *
 * A Nexha is a federated business network node. FederationOS manages:
 * - Nexha registration (each Nexha must be a member to participate)
 * - Federation handshake (mutual agreement between Nexhas)
 * - Membership status (active/suspended/expelled)
 * - Governance policies (rules all members must follow)
 */

/** Nexha membership tier. */
export type MembershipTier = 'founding' | 'strategic' | 'standard' | 'associate' | 'observer';

/** Nexha lifecycle status. */
export type MembershipStatus = 'pending' | 'active' | 'suspended' | 'expelled' | 'churned';

/** Federation handshake state between two Nexhas. */
export type HandshakeStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'revoked';

/** Governance policy category. */
export type PolicyCategory = 'data-privacy' | 'payment' | 'liability' | 'compliance' | 'conduct' | 'technical';

/** Governance policy enforcement level. */
export type PolicyEnforcement = 'mandatory' | 'recommended' | 'optional';

/** A registered Nexha (federation member). */
export interface Nexha {
  id: string;
  name: string;
  description: string;
  tier: MembershipTier;
  status: MembershipStatus;
  /** Region (ISO country code) */
  region: string;
  /** Contact email */
  contactEmail: string;
  /** Public key fingerprint for federation handshake */
  publicKey: string;
  /** Supported capability categories */
  categories: string[];
  /** Operating Nexha OS version */
  osVersion: string;
  /** When this Nexha joined */
  joinedAt: string;
  /** Last federation sync */
  lastSyncAt: string;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/** Federation handshake between two Nexhas. */
export interface Handshake {
  id: string;
  /** Initiating Nexha */
  initiatorId: string;
  /** Target Nexha */
  targetId: string;
  status: HandshakeStatus;
  /** Terms being proposed */
  terms: {
    mutualCapabilities: string[];
    dataSharing: 'none' | 'public' | 'aggregated' | 'full';
    paymentTerms: 'standard' | 'preferred' | 'custom';
    liabilityCap?: number;
  };
  /** Cryptographic signatures */
  initiatorSignature: string;
  targetSignature?: string;
  /** Timestamps */
  initiatedAt: string;
  respondedAt?: string;
  expiresAt?: string;
}

/** Federation-wide governance policy. */
export interface GovernancePolicy {
  id: string;
  title: string;
  description: string;
  category: PolicyCategory;
  enforcement: PolicyEnforcement;
  /** Rules expressed as conditions → required actions */
  rules: {
    when: string;
    then: string;
    appliesTo?: ('all' | MembershipTier[])[];
  }[];
  /** When this policy was created / updated */
  createdAt: string;
  updatedAt: string;
  /** Version for tracking changes */
  version: number;
}

/** Federation-wide stats. */
export interface FederationStats {
  totalNexhas: number;
  byTier: Record<MembershipTier, number>;
  byStatus: Record<MembershipStatus, number>;
  totalHandshakes: number;
  activeHandshakes: number;
  totalPolicies: number;
  /** Regions covered (ISO country codes) */
  regions: string[];
}

/** Join federation request. */
export interface JoinRequest {
  name: string;
  description: string;
  region: string;
  contactEmail: string;
  publicKey: string;
  categories: string[];
  osVersion: string;
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  nexhas: number;
  handshakes: number;
  policies: number;
  timestamp: string;
}