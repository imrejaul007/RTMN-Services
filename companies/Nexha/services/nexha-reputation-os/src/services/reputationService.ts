/**
 * ReputationOS — ACI scoring engine
 *
 * Maintains per-subject reputation scores derived from signal streams.
 * ACI = weighted aggregate of all signals, normalized to 0-1000.
 *
 * Scoring breakdown (out of 1000):
 *   - Transactions:  success/failure → +/- per transaction (capped at ±300)
 *   - Disputes:      resolved in favor/against → +/- (capped at ±200)
 *   - Endorsements:  received → + per (capped at +200)
 *   - Verifications: KYC/business → + (capped at +150)
 *   - Risk events:   low/medium/high/critical → - (capped at -150)
 *
 * Base ACI = 500 (neutral). Aggregated signals push it up or down.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  BAND_THRESHOLDS,
  ReputationSignal,
  ReputationScore,
  ReputationQuery,
  ReputationSubjectType,
  TrustBand,
  FederationReputationStats
} from '../types/index.js';

// Re-export thresholds for convenience
export const BAND_THRESHOLDS_LOCAL: Record<Exclude<TrustBand, 'unknown'>, number> = {
  platinum: 900,
  gold: 800,
  silver: 700,
  bronze: 500,
  iron: 300,
  restricted: 0
};

/** Score weights per signal kind. */
const SIGNAL_WEIGHTS: Record<ReputationSignal['kind'], number> = {
  transaction_success: 10,
  transaction_failure: -15,
  dispute_raised: -5,
  dispute_resolved_in_favor: 20,
  dispute_resolved_against: -25,
  endorsement_received: 8,
  endorsement_given: 2,
  verification_kyc: 50,
  verification_business: 60,
  risk_event_low: -3,
  risk_event_medium: -10,
  risk_event_high: -30,
  risk_event_critical: -75,
  compliance_violation: -50
};

/** Capped contribution per dimension (out of 1000). */
const DIMENSION_CAPS = {
  transactions: 300,
  disputes: 200,
  endorsements: 200,
  verifications: 150,
  risk: 150
};

/** Neutral starting score. */
const BASE_ACI = 500;

/** Helper: clamp a number between min and max. */
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Helper: derive trust band from ACI score. */
function scoreToBand(aci: number): TrustBand {
  if (aci >= BAND_THRESHOLDS_LOCAL.platinum) return 'platinum';
  if (aci >= BAND_THRESHOLDS_LOCAL.gold) return 'gold';
  if (aci >= BAND_THRESHOLDS_LOCAL.silver) return 'silver';
  if (aci >= BAND_THRESHOLDS_LOCAL.bronze) return 'bronze';
  if (aci >= BAND_THRESHOLDS_LOCAL.iron) return 'iron';
  return 'restricted';
}

class ReputationService {
  /** ACI scores by subjectId */
  private scores = new Map<string, ReputationScore>();
  /** Signal log by subjectId (newest last) */
  private signals = new Map<string, ReputationSignal[]>();

  /** Compute per-dimension contribution from a subject's signals. */
  private computeDimensions(subjectId: string) {
    const sigs = this.signals.get(subjectId) ?? [];
    let transactions = 0;
    let disputes = 0;
    let endorsements = 0;
    let verifications = 0;
    let risk = 0;

    for (const sig of sigs) {
      const baseW = SIGNAL_WEIGHTS[sig.kind];
      const weighted = baseW * sig.weight;
      switch (sig.kind) {
        case 'transaction_success':
        case 'transaction_failure':
          transactions += weighted;
          break;
        case 'dispute_raised':
        case 'dispute_resolved_in_favor':
        case 'dispute_resolved_against':
          disputes += weighted;
          break;
        case 'endorsement_received':
        case 'endorsement_given':
          endorsements += weighted;
          break;
        case 'verification_kyc':
        case 'verification_business':
          verifications += weighted;
          break;
        case 'risk_event_low':
        case 'risk_event_medium':
        case 'risk_event_high':
        case 'risk_event_critical':
        case 'compliance_violation':
          risk += weighted;
          break;
      }
    }

    // Cap each dimension
    transactions = clamp(transactions, -DIMENSION_CAPS.transactions, DIMENSION_CAPS.transactions);
    disputes = clamp(disputes, -DIMENSION_CAPS.disputes, DIMENSION_CAPS.disputes);
    endorsements = clamp(endorsements, 0, DIMENSION_CAPS.endorsements);
    verifications = clamp(verifications, 0, DIMENSION_CAPS.verifications);
    risk = clamp(risk, -DIMENSION_CAPS.risk, 0);

    return { transactions, disputes, endorsements, verifications, risk };
  }

  /** Compute ACI from dimensions. */
  private computeAci(dims: ReturnType<typeof this.computeDimensions>): number {
    const sum =
      dims.transactions +
      dims.disputes +
      dims.endorsements +
      dims.verifications +
      dims.risk;
    return clamp(BASE_ACI + sum, 0, 1000);
  }

  /** Get or create a score for a subject. */
  private getOrCreateScore(subjectId: string, subjectType: ReputationSubjectType): ReputationScore {
    let existing = this.scores.get(subjectId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const score: ReputationScore = {
      subjectId,
      subjectType,
      aci: BASE_ACI,
      band: 'bronze', // 500 maps to bronze
      components: { transactions: 0, disputes: 0, endorsements: 0, verifications: 0, risk: 0 },
      signalCount: 0,
      lastSignalAt: now,
      version: 1,
      createdAt: now,
      updatedAt: now
    };
    this.scores.set(subjectId, score);
    return score;
  }

  /** Recompute score for a subject (after new signals). */
  private recompute(subjectId: string): ReputationScore | null {
    const score = this.scores.get(subjectId);
    if (!score) return null;
    const dims = this.computeDimensions(subjectId);
    const sigs = this.signals.get(subjectId) ?? [];
    const lastSignalAt = sigs.length > 0
      ? sigs.map((s) => s.occurredAt).sort().reverse()[0]
      : score.createdAt;
    const updated: ReputationScore = {
      ...score,
      aci: this.computeAci(dims),
      band: scoreToBand(this.computeAci(dims)),
      components: dims,
      signalCount: sigs.length,
      lastSignalAt,
      version: score.version + 1,
      updatedAt: new Date().toISOString()
    };
    this.scores.set(subjectId, updated);
    return updated;
  }

  /** Seed demo data. */
  seedDemo(): number {
    if (this.scores.size > 0) return 0;

    const now = () => new Date().toISOString();
    const subjects: Array<{
      id: string;
      type: ReputationSubjectType;
      signals: ReputationSignal[];
    }> = [
      {
        id: 'nexha-maya-collective',
        type: 'nexha',
        signals: this.buildMayaSignals(now)
      },
      {
        id: 'nexha-logistics-mumbai',
        type: 'nexha',
        signals: this.buildLogisticsSignals(now)
      },
      {
        id: 'agent-maya-merchant',
        type: 'agent',
        signals: [
          { kind: 'transaction_success', weight: 1, amount: 500, occurredAt: now() },
          { kind: 'transaction_success', weight: 1, amount: 1200, occurredAt: now() },
          { kind: 'transaction_success', weight: 1, amount: 800, occurredAt: now() },
          { kind: 'endorsement_received', weight: 1, endorserId: 'nexha-maya-collective', occurredAt: now() },
          { kind: 'verification_kyc', weight: 1, verifierId: 'verifier-sada', occurredAt: now() }
        ]
      },
      {
        id: 'service-tax-advisor',
        type: 'service',
        signals: [
          { kind: 'transaction_failure', weight: 1, amount: 200, occurredAt: now() },
          { kind: 'dispute_raised', weight: 1, occurredAt: now() },
          { kind: 'risk_event_medium', weight: 1, occurredAt: now() }
        ]
      }
    ];

    for (const s of subjects) {
      this.getOrCreateScore(s.id, s.type);
      this.signals.set(s.id, s.signals);
      this.recompute(s.id);
    }

    return subjects.length;
  }

  private buildMayaSignals(now: () => string): ReputationSignal[] {
    const sigs: ReputationSignal[] = [];
    // 50 successful transactions
    for (let i = 0; i < 50; i++) {
      sigs.push({ kind: 'transaction_success', weight: 1, amount: 1000 + i * 50, occurredAt: now() });
    }
    // 2 disputes resolved in favor
    sigs.push({ kind: 'dispute_resolved_in_favor', weight: 1, occurredAt: now() });
    sigs.push({ kind: 'dispute_resolved_in_favor', weight: 1, occurredAt: now() });
    // 5 endorsements
    for (let i = 0; i < 5; i++) {
      sigs.push({ kind: 'endorsement_received', weight: 1, endorserId: `nexha-${i}`, occurredAt: now() });
    }
    // KYC + business verification
    sigs.push({ kind: 'verification_kyc', weight: 1, verifierId: 'verifier-sada', occurredAt: now() });
    sigs.push({ kind: 'verification_business', weight: 1, verifierId: 'verifier-sada', occurredAt: now() });
    return sigs;
  }

  private buildLogisticsSignals(now: () => string): ReputationSignal[] {
    const sigs: ReputationSignal[] = [];
    // 20 successful
    for (let i = 0; i < 20; i++) {
      sigs.push({ kind: 'transaction_success', weight: 1, amount: 500, occurredAt: now() });
    }
    // 1 dispute resolved in favor
    sigs.push({ kind: 'dispute_resolved_in_favor', weight: 1, occurredAt: now() });
    // 1 risk event (low)
    sigs.push({ kind: 'risk_event_low', weight: 1, occurredAt: now() });
    // KYC
    sigs.push({ kind: 'verification_kyc', weight: 1, verifierId: 'verifier-sada', occurredAt: now() });
    return sigs;
  }

  /** Ingest a new signal. */
  ingest(subjectId: string, subjectType: ReputationSubjectType, signal: ReputationSignal): ReputationScore {
    this.getOrCreateScore(subjectId, subjectType);
    const existing = this.signals.get(subjectId) ?? [];
    this.signals.set(subjectId, [...existing, signal]);
    const recomputed = this.recompute(subjectId);
    if (!recomputed) throw new Error('Failed to recompute score');
    return recomputed;
  }

  /** Get a score by subjectId. */
  get(subjectId: string): ReputationScore | null {
    return this.scores.get(subjectId) ?? null;
  }

  /** Query scores with filters. */
  query(q: ReputationQuery): { scores: ReputationScore[]; total: number } {
    const limit = Math.min(q.limit ?? 50, 200);
    const offset = q.offset ?? 0;
    let results = Array.from(this.scores.values());
    if (q.subjectId) results = results.filter((s) => s.subjectId === q.subjectId);
    if (q.subjectType) results = results.filter((s) => s.subjectType === q.subjectType);
    if (q.minAci !== undefined) results = results.filter((s) => s.aci >= q.minAci!);
    if (q.maxAci !== undefined) results = results.filter((s) => s.aci <= q.maxAci!);
    if (q.band) results = results.filter((s) => s.band === q.band);
    // Sort by ACI desc
    results.sort((a, b) => b.aci - a.aci);
    const total = results.length;
    return { scores: results.slice(offset, offset + limit), total };
  }

  /** Get signals for a subject. */
  getSignals(subjectId: string): ReputationSignal[] {
    return [...(this.signals.get(subjectId) ?? [])];
  }

  /** Get signals by kind (for filtering). */
  getSignalsByKind(subjectId: string, kind: ReputationSignal['kind']): ReputationSignal[] {
    return this.getSignals(subjectId).filter((s) => s.kind === kind);
  }

  /** Federation-wide stats. */
  getFederationStats(): FederationReputationStats {
    const all = Array.from(this.scores.values());
    const byBand: Record<TrustBand, number> = {
      platinum: 0, gold: 0, silver: 0, bronze: 0, iron: 0, restricted: 0, unknown: 0
    };
    const bySubjectType: Record<ReputationSubjectType, number> = {
      nexha: 0, agent: 0, merchant: 0, user: 0, asset: 0, service: 0
    };
    let totalAci = 0;
    let totalSignals = 0;
    let recentSignals = 0;
    const oneDayAgo = Date.now() - 24 * 3600 * 1000;

    for (const s of all) {
      byBand[s.band]++;
      bySubjectType[s.subjectType]++;
      totalAci += s.aci;
      totalSignals += s.signalCount;
    }

    // Count recent signals
    for (const sigs of this.signals.values()) {
      for (const sig of sigs) {
        if (new Date(sig.occurredAt).getTime() >= oneDayAgo) recentSignals++;
      }
    }

    const topPerformers = [...all].sort((a, b) => b.aci - a.aci).slice(0, 10);

    return {
      totalSubjects: all.length,
      totalSignals,
      averageAci: all.length > 0 ? Math.round(totalAci / all.length) : 0,
      byBand,
      bySubjectType,
      topPerformers,
      recentSignals
    };
  }

  /** Reset state (testing). */
  reset(): void {
    this.scores.clear();
    this.signals.clear();
  }
}

const reputationService = new ReputationService();
export default reputationService;