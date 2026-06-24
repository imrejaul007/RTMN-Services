/**
 * ReputationOS — Type definitions
 *
 * The ACI (Autonomous Commerce Index) is a single 0-1000 reputation score
 * computed from multiple signal streams across the federation.
 */

/** Subject types that can have a reputation score. */
export type ReputationSubjectType = 'nexha' | 'agent' | 'merchant' | 'user' | 'asset' | 'service';

/** Trust bands derived from score. */
export type TrustBand = 'platinum' | 'gold' | 'silver' | 'bronze' | 'iron' | 'restricted' | 'unknown';

/** Trust band thresholds (0-1000 scale). */
export const BAND_THRESHOLDS: Record<Exclude<TrustBand, 'unknown'>, number> = {
  platinum: 900,
  gold: 800,
  silver: 700,
  bronze: 500,
  iron: 300,
  restricted: 0
};

/** Single signal that contributes to ACI. */
export type ReputationSignal =
  | { kind: 'transaction_success'; weight: number; amount?: number; counterpartyId?: string; occurredAt: string }
  | { kind: 'transaction_failure'; weight: number; amount?: number; counterpartyId?: string; occurredAt: string }
  | { kind: 'dispute_raised'; weight: number; counterpartyId?: string; occurredAt: string }
  | { kind: 'dispute_resolved_in_favor'; weight: number; occurredAt: string }
  | { kind: 'dispute_resolved_against'; weight: number; occurredAt: string }
  | { kind: 'endorsement_received'; weight: number; endorserId: string; occurredAt: string }
  | { kind: 'endorsement_given'; weight: number; recipientId: string; occurredAt: string }
  | { kind: 'verification_kyc'; weight: number; verifierId: string; occurredAt: string }
  | { kind: 'verification_business'; weight: number; verifierId: string; occurredAt: string }
  | { kind: 'risk_event_low'; weight: number; occurredAt: string }
  | { kind: 'risk_event_medium'; weight: number; occurredAt: string }
  | { kind: 'risk_event_high'; weight: number; occurredAt: string }
  | { kind: 'risk_event_critical'; weight: number; occurredAt: string }
  | { kind: 'compliance_violation'; weight: number; occurredAt: string };

/** Computed ACI reputation score for a subject. */
export interface ReputationScore {
  /** Subject identifier (Nexha id, agent id, merchant id, etc.) */
  subjectId: string;
  /** Subject type */
  subjectType: ReputationSubjectType;
  /** ACI score on 0-1000 scale */
  aci: number;
  /** Band derived from ACI */
  band: TrustBand;
  /** Per-dimension breakdown */
  components: {
    transactions: number;
    disputes: number;
    endorsements: number;
    verifications: number;
    risk: number;
  };
  /** Total signals ingested */
  signalCount: number;
  /** Last signal time (or score creation time) */
  lastSignalAt: string;
  /** Score version (incremented on each recompute) */
  version: number;
  /** Created/updated timestamps */
  createdAt: string;
  updatedAt: string;
}

/** Reputation query — what we want to learn about a subject. */
export interface ReputationQuery {
  /** Filter by subject id (optional) */
  subjectId?: string;
  /** Filter by subject type */
  subjectType?: ReputationSubjectType;
  /** Minimum ACI score (inclusive) */
  minAci?: number;
  /** Maximum ACI score (inclusive) */
  maxAci?: number;
  /** Filter by trust band */
  band?: TrustBand;
  /** Pagination */
  limit?: number;
  offset?: number;
}

/** Ingest a new signal — request body. */
export interface IngestSignalRequest {
  subjectId: string;
  subjectType: ReputationSubjectType;
  signal: ReputationSignal;
}

/** Federation-wide reputation stats. */
export interface FederationReputationStats {
  totalSubjects: number;
  totalSignals: number;
  averageAci: number;
  byBand: Record<TrustBand, number>;
  bySubjectType: Record<ReputationSubjectType, number>;
  topPerformers: ReputationScore[];
  recentSignals: number; // last 24h
}

/** Health response. */
export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  version: string;
  port: number;
  uptime: number;
  subjects: number;
  signals: number;
  timestamp: string;
}