/**
 * @hojai/reputation — Unified Trust & Reputation SDK for the HOJAI AI ecosystem.
 *
 * Wraps six trust surfaces into one consistent API:
 *  - agent-reputation        — AI agent trust scores, transactions, verification
 *  - dispute-resolution      — arbitration, mediation, evidence, escalation
 *  - risk-detection-service  — real-time risk scoring + flags
 *  - sada-os                 — Trust / Governance / Risk / Verification backbone
 *  - trust-network           — cross-entity trust graph
 *  - leaderboard             — unified cross-system leaderboards
 *
 * Usage:
 *   import { Reputation } from '@hojai/reputation';
 *   const rep = new Reputation({ apiKey: 'sk_...', baseUrl: 'https://hub.example.com' });
 *   const agentTrust = await rep.agent.getTrust('agent-1');
 *   const flags = await rep.risk.listFlags({ severity: 'high' });
 *   const lb = await rep.leaderboard.agentTopTrusted(20);
 */

import type { HojaiConfig } from './foundation-config.js';
import { resolveConfig } from './foundation-config.js';
import { AgentReputationClient } from './agent.js';
import { DisputeClient } from './dispute.js';
import { RiskClient } from './risk.js';
import { SadaClient } from './sada.js';
import { TrustNetworkClient } from './network.js';
import { LeaderboardClient } from './leaderboard.js';

// Re-exports for subpath consumers
export { AgentReputationClient } from './agent.js';
export { DisputeClient } from './dispute.js';
export { RiskClient } from './risk.js';
export { SadaClient } from './sada.js';
export { TrustNetworkClient } from './network.js';
export { LeaderboardClient } from './leaderboard.js';
export { DEFAULT_CONFIG } from './foundation-config.js';
export { request, sleep, backoff, HttpError, buildUrl } from './utils.js';

export type { HojaiConfig } from './foundation-config.js';
export type ResolvedHojaiConfig = ReturnType<typeof resolveConfig>;

export type {
  AgentStatus,
  TrustBand,
  AgentReputation,
  AgentTransaction
} from './agent.js';
export type {
  DisputeStatus,
  DisputeReason,
  Dispute,
  Evidence,
  Mediation,
  Arbitration
} from './dispute.js';
export type {
  RiskLevel,
  RiskCategory,
  RiskAssessment as RiskEvalRecord,
  RiskFlag as RiskFlagRecord
} from './risk.js';
export type {
  EntityType,
  TrustScore,
  TrustActivity,
  GovernancePolicy,
  PolicyValidation,
  VerificationRecord
} from './sada.js';
export type {
  TrustEntityType,
  TrustVerificationType,
  TrustEntity,
  TrustEndorsement,
  TrustVerification,
  TrustRiskFlag
} from './network.js';
export type {
  LeaderboardType,
  LeaderboardEntry,
  Leaderboard
} from './leaderboard.js';

export class Reputation {
  readonly agent: AgentReputationClient;
  readonly dispute: DisputeClient;
  readonly risk: RiskClient;
  readonly sada: SadaClient;
  readonly network: TrustNetworkClient;
  readonly leaderboard: LeaderboardClient;
  readonly config: ReturnType<typeof resolveConfig>;

  constructor(config: HojaiConfig) {
    const resolved = resolveConfig(config);
    this.config = resolved;
    this.agent = new AgentReputationClient(resolved);
    this.dispute = new DisputeClient(resolved);
    this.risk = new RiskClient(resolved);
    this.sada = new SadaClient(resolved);
    this.network = new TrustNetworkClient(resolved);
    this.leaderboard = new LeaderboardClient(resolved);
  }
}

export default Reputation;