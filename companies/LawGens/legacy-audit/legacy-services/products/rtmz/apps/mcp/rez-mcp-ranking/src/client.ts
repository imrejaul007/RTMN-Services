// REST Client for Ranking Service
const RANKING_SERVICE_URL = process.env.RANKING_SERVICE_URL || 'http://localhost:5006';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface RankedItem {
  id: string;
  score: number;
  rank: number;
  features?: Record<string, number>;
}

export interface RankingRequest {
  items: Array<{
    id: string;
    features: Record<string, number>;
  }>;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface RankingResult {
  experimentId?: string;
  rankedItems: RankedItem[];
  timestamp: string;
}

export interface ExperimentConfig {
  name: string;
  algorithm: string;
  features: string[];
  weights?: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  algorithm: string;
  status: 'pending' | 'training' | 'active' | 'archived';
  createdAt: string;
  metrics?: {
    ndcg?: number;
    precision?: number;
    recall?: number;
  };
}

export interface Feedback {
  itemId: string;
  userId: string;
  interaction: 'click' | 'view' | 'purchase' | 'skip';
  timestamp: string;
  context?: Record<string, unknown>;
}

export interface RankingStats {
  totalItems: number;
  totalRankings: number;
  averageNDCG: number;
  activeExperiments: number;
  lastUpdated: string;
}

export async function fetchFromRanking<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${RANKING_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`Ranking API error (${endpoint}):`, error);
    return null;
  }
}

export async function rankItems(request: RankingRequest): Promise<RankingResult | null> {
  return fetchFromRanking<RankingResult>('/api/ranking/rank', {
    method: 'POST',
    body: JSON.stringify(request)
  });
}

export async function createExperiment(config: ExperimentConfig): Promise<Experiment | null> {
  return fetchFromRanking<Experiment>('/api/ranking/experiments', {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

export async function logFeedback(feedback: Feedback): Promise<{ success: boolean } | null> {
  return fetchFromRanking<{ success: boolean }>('/api/ranking/feedback', {
    method: 'POST',
    body: JSON.stringify(feedback)
  });
}

export async function getStats(): Promise<RankingStats | null> {
  return fetchFromRanking<RankingStats>('/api/ranking/stats');
}
