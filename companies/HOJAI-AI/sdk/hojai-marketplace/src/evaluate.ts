/**
 * BAM Multi-Agent Evaluator Client
 *
 * Wraps the blr-multi-agent-evaluator service (port 4257). Compare multiple
 * listings (typically agents or packs) head-to-head across weighted
 * dimensions and produce a single ranked recommendation.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface EvaluationCriterion {
  /** Criterion id (e.g. 'price', 'rating', 'latency', 'compliance') */
  id: string;
  /** Higher weight = more important. Defaults to 1. */
  weight?: number;
  /** 'higher' = larger values are better (e.g. rating); 'lower' = smaller are better (e.g. price) */
  direction?: 'higher' | 'lower';
}

export interface EvaluationCandidate {
  id: string;
  /** Candidate values for each criterion */
  values: Record<string, number>;
  metadata?: Record<string, unknown>;
}

export interface Evaluation {
  id: string;
  name: string;
  criteria: EvaluationCriterion[];
  candidates: EvaluationCandidate[];
  /** Computed scores after the call — id → weighted score */
  scores: Record<string, number>;
  /** Highest-scoring candidate id */
  winnerId?: string;
  createdAt: string;
}

export interface CreateEvaluationRequest {
  name: string;
  criteria: EvaluationCriterion[];
  candidates: EvaluationCandidate[];
}

export interface CompareRequest {
  criteria: EvaluationCriterion[];
  candidates: EvaluationCandidate[];
}

export interface CompareResult {
  scores: Record<string, number>;
  winnerId: string;
  /** Per-criterion normalized values for transparency */
  normalized: Record<string, Record<string, number>>;
}

export class EvaluateClient {
  constructor(private config: HojaiConfig) {}

  /** Create a persistent evaluation (auth required). */
  async create(input: CreateEvaluationRequest): Promise<Evaluation> {
    return request<Evaluation>(this.config, 'POST', '/api/evaluations', input);
  }

  /** List stored evaluations. */
  async list(input: { limit?: number; offset?: number } = {}): Promise<Evaluation[]> {
    const qs = buildQueryString(input as Record<string, unknown>);
    return request<Evaluation[]>(this.config, 'GET', `/api/evaluations${qs}`);
  }

  /** Get a stored evaluation by id. */
  async get(id: string): Promise<Evaluation> {
    return request<Evaluation>(this.config, 'GET', `/api/evaluations/${encodeURIComponent(id)}`);
  }

  /** Compare candidates without persisting (auth required). */
  async compare(input: CompareRequest): Promise<CompareResult> {
    return request<CompareResult>(this.config, 'POST', '/api/evaluations/compare', input);
  }
}
