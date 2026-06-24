/**
 * Genie Lifestyle Client
 *
 * Wraps six lifestyle-focused services:
 *   - genie-learning-os        (port 4722) — Personal learning paths
 *   - genie-wellness-os         (port 4723) — Health + wellness
 *   - genie-money-os            (port 4724) — Personal finance
 *   - genie-execution-engine    (port 4726) — Task + habit execution
 *   - genie-creation-os         (port 4298) — Content creation
 *   - genie-life-university     (port 4727) — Curated learning content
 *
 * Each surface exposes a small, opinionated set of methods.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface LearningPath {
  id: string;
  userId: string;
  title: string;
  topic: string;
  /** Ordered list of module ids */
  modules: Array<{ id: string; title: string; durationMin: number; done: boolean }>;
  progress: number;
  startedAt: string;
  targetCompletionAt?: string;
}

export interface WellnessEntry {
  id: string;
  userId: string;
  kind: 'mood' | 'sleep' | 'exercise' | 'water' | 'meditation' | 'meal';
  value: number;
  unit: string;
  capturedAt: string;
  notes?: string;
}

export interface MoneyTransaction {
  id: string;
  userId: string;
  amount: { amount: number; currency: string };
  category: string;
  description: string;
  occurredAt: string;
  /** 'expense' | 'income' | 'transfer' */
  kind: 'expense' | 'income' | 'transfer';
  merchant?: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  cadence: 'daily' | 'weekly' | 'weekdays' | 'custom';
  /** ISO weekday numbers (1=Mon..7=Sun) for custom cadence */
  daysOfWeek?: number[];
  streak: number;
  longestStreak: number;
  lastCompletedAt?: string;
}

export interface Creation {
  id: string;
  userId: string;
  kind: 'image' | 'video' | 'audio' | 'article' | 'design' | 'code';
  title: string;
  /** URL to the created artifact */
  url: string;
  prompt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export class LifestyleClient {
  constructor(private config: HojaiConfig) {}

  // -------- Learning (genie-learning-os) --------

  /** Get a user's learning paths. */
  async listLearningPaths(userId: string): Promise<LearningPath[]> {
    return request<LearningPath[]>(this.config, 'GET', `/api/learning/paths${buildQueryString({ userId })}`);
  }

  /** Start a new learning path. */
  async startLearningPath(input: { userId: string; topic: string }): Promise<LearningPath> {
    return request<LearningPath>(this.config, 'POST', '/api/learning/paths', input);
  }

  // -------- Wellness (genie-wellness-os) --------

  /** Log a wellness entry. */
  async logWellness(input: Omit<WellnessEntry, 'id' | 'capturedAt'>): Promise<WellnessEntry> {
    return request<WellnessEntry>(this.config, 'POST', '/api/wellness/entries', input);
  }

  /** Get recent wellness entries. */
  async listWellness(input: { userId: string; kind?: WellnessEntry['kind']; limit?: number }): Promise<WellnessEntry[]> {
    return request<WellnessEntry[]>(this.config, 'GET', `/api/wellness/entries${buildQueryString(input as Record<string, unknown>)}`);
  }

  // -------- Money (genie-money-os) --------

  /** Record a transaction. */
  async recordTransaction(input: Omit<MoneyTransaction, 'id'>): Promise<MoneyTransaction> {
    return request<MoneyTransaction>(this.config, 'POST', '/api/money/transactions', input);
  }

  /** List transactions, optionally filtered. */
  async listTransactions(input: { userId: string; kind?: MoneyTransaction['kind']; category?: string; from?: string; to?: string; limit?: number }): Promise<MoneyTransaction[]> {
    return request<MoneyTransaction[]>(this.config, 'GET', `/api/money/transactions${buildQueryString(input as Record<string, unknown>)}`);
  }

  // -------- Execution (genie-execution-engine) --------

  /** List the user's habits. */
  async listHabits(userId: string): Promise<Habit[]> {
    return request<Habit[]>(this.config, 'GET', `/api/execution/habits${buildQueryString({ userId })}`);
  }

  /** Mark a habit complete for today. */
  async completeHabit(habitId: string): Promise<Habit> {
    return request<Habit>(this.config, 'POST', `/api/execution/habits/${encodeURIComponent(habitId)}/complete`);
  }

  // -------- Creation (genie-creation-os) --------

  /** Generate a new creation. */
  async create(input: Omit<Creation, 'id' | 'createdAt' | 'url'> & { /** Optional callback URL for async generation */ callbackUrl?: string }): Promise<Creation> {
    return request<Creation>(this.config, 'POST', '/api/creation', input);
  }

  // -------- Life University (genie-life-university) --------

  /** List curated learning content. */
  async university(input: { topic?: string; limit?: number } = {}): Promise<Array<{ id: string; title: string; topic: string; durationMin: number; url: string }>> {
    return request(this.config, 'GET', `/api/university/content${buildQueryString(input as Record<string, unknown>)}`);
  }
}
