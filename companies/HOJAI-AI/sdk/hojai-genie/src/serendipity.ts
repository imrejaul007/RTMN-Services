/**
 * Genie Serendipity Client
 *
 * Wraps two related services:
 *   - genie-serendipity-service        (port 4714) — Random memory resurfacing
 *   - genie-smart-forgetting-service   (port 4715) — Auto-archive old/duplicate memories
 *
 * Serendipity = the magic of "I forgot I had this memory" resurfacing.
 * Smart forgetting = the discipline of keeping the memory graph healthy.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface SerendipityHit {
  memoryId: string;
  type: string;
  content: string;
  capturedAt: string;
  /** Why was this surfaced? 'random' | 'anniversary' | 'related-to-recent' | 'seasonal' */
  reason: 'random' | 'anniversary' | 'related-to-recent' | 'seasonal';
  score: number;
}

export interface SmartForgetResult {
  archived: number;
  duplicatesCollapsed: number;
  remainingCount: number;
  /** IDs of affected memories */
  affected: string[];
}

export class SerendipityClient {
  constructor(private config: HojaiConfig) {}

  /** Get a random resurfaced memory for the user today. */
  async daily(userId: string): Promise<SerendipityHit> {
    return request<SerendipityHit>(this.config, 'GET', `/api/serendipity/daily${buildQueryString({ userId })}`);
  }

  /** Get the user's serendipity history (past resurfaced memories). */
  async history(input: { userId: string; limit?: number }): Promise<SerendipityHit[]> {
    return request<SerendipityHit[]>(this.config, 'GET', `/api/serendipity/history${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Get a memory based on time-of-day context (morning-evening variations). */
  async timeBased(input: { userId: string; hour?: number }): Promise<SerendipityHit> {
    return request<SerendipityHit>(this.config, 'GET', `/api/serendipity/time${buildQueryString(input as Record<string, unknown>)}`);
  }

  /** Trigger smart-forgetting: archive expired, collapse duplicates. */
  async smartForget(input: { userId: string; strategy: 'expired' | 'duplicates' | 'all'; dryRun?: boolean }): Promise<SmartForgetResult> {
    return request<SmartForgetResult>(this.config, 'POST', '/api/smart-forget', input);
  }
}
