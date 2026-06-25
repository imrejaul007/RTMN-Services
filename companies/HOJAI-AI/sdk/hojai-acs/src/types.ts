// ACS SDK — type definitions for the Agent Capability Index

export type TrustBand = 'elite' | 'expert' | 'proficient' | 'developing' | 'novice' | 'unverified';

export interface ACSAgent {
  id: string;
  name: string;
  ownerId: string | null;
  domains: string[];
  createdAt: string;
}

export type SignalKind =
  | 'task_completed'
  | 'task_failed'
  | 'response_time'
  | 'endorsement_received'
  | 'certification_earned'
  | 'specialization_added'
  | 'error_rate';

export interface Signal {
  id: string;
  agentId: string;
  kind: SignalKind;
  weight: number;
  domain: string | null;
  meta: Record<string, unknown>;
  occurredAt: string;
}

export interface ScoreBreakdown {
  taskSuccess: { raw: number; total: number; pts: number; max: number };
  responseTime: { pts: number; max: number };
  specialization: { domains: number; pts: number; max: number };
  certification: { count: number; pts: number; max: number };
  endorsements: { count: number; pts: number; max: number };
}

export interface ACSScore {
  score: number;
  breakdown: ScoreBreakdown;
  band: TrustBand;
  computedAt: string;
}

export interface RankingEntry {
  agentId: string;
  name: string;
  domains: string[];
  score: number;
  band: TrustBand;
}

export interface ACSStats {
  agents: number;
  signals: number;
  avgScore: number | null;
  topDomain: string | null;
  domainCounts: Record<string, number>;
  bandDistribution: Record<TrustBand, number>;
  uptime: number;
}
