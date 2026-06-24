/**
 * SUTAR Learning Client
 *
 * Agent learning and improvement. SUTAR agents learn from interactions
 * and improve over time.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type LearningEventType = 'success' | 'failure' | 'feedback' | 'correction' | 'observation';

export interface LearningEvent {
  id: string;
  agentId: string;
  type: LearningEventType;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  outcome: 'positive' | 'negative' | 'neutral';
  context: Record<string, unknown>;
  timestamp: string;
  weight: number; // 0..1, importance of this learning
}

export interface LearningStats {
  agentId: string;
  totalEvents: number;
  successRate: number;
  avgImprovement: number; // % improvement over baseline
  lastUpdate: string;
  learningVelocity: number; // events per day
}

export interface LearningFeedback {
  agentId: string;
  eventId: string;
  rating: number; // 1-5
  text?: string;
  categories?: string[];
}

export class LearningClient {
  constructor(private config: HojaiConfig) {}

  async record(event: Omit<LearningEvent, 'id' | 'timestamp'>): Promise<LearningEvent> {
    return request<LearningEvent>(this.config, 'POST', '/api/v1/learning/events', event);
  }

  async getStats(agentId: string): Promise<LearningStats> {
    return request<LearningStats>(this.config, 'GET', `/api/v1/learning/agents/${encodeURIComponent(agentId)}/stats`);
  }

  async listEvents(agentId: string, options: { type?: LearningEventType; since?: string; limit?: number } = {}): Promise<LearningEvent[]> {
    return request<LearningEvent[]>(this.config, 'GET', `/api/v1/learning/agents/${encodeURIComponent(agentId)}/events?type=${options.type || ''}&since=${options.since || ''}&limit=${options.limit || 50}`);
  }

  async submitFeedback(input: LearningFeedback): Promise<{ acknowledged: boolean }> {
    return request<{ acknowledged: boolean }>(this.config, 'POST', '/api/v1/learning/feedback', input);
  }

  async getModelVersion(agentId: string): Promise<{ version: string; trainedAt: string; performance: Record<string, number> }> {
    return request<{ version: string; trainedAt: string; performance: Record<string, number> }>(this.config, 'GET', `/api/v1/learning/agents/${encodeURIComponent(agentId)}/model`);
  }

  async triggerTraining(agentId: string): Promise<{ trainingId: string; estimatedCompletionAt: string }> {
    return request<{ trainingId: string; estimatedCompletionAt: string }>(this.config, 'POST', `/api/v1/learning/agents/${encodeURIComponent(agentId)}/train`);
  }
}
