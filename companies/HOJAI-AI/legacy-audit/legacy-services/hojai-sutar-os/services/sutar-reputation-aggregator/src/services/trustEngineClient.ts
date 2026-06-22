import { TrustScoreResult, TrustEngineRequest, TrustTier, TrustFactor, EntityType } from '../types/index.js';

const TRUST_ENGINE_URL = process.env.TRUST_ENGINE_URL || 'http://localhost:4180';

interface TrustEngineResponse {
  success: boolean;
  data?: {
    score: number;
    tier: TrustTier;
    factors: Array<{
      name: string;
      weight: number;
      score: number;
      impact: 'positive' | 'neutral' | 'negative';
    }>;
    verified: boolean;
    lastVerified: string;
  };
  error?: string;
}

export class TrustEngineClient {
  private baseUrl: string;
  private timeout: number;
  private retryAttempts: number;

  constructor(baseUrl: string = TRUST_ENGINE_URL, timeout: number = 5000, retryAttempts: number = 3) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.retryAttempts = retryAttempts;
  }

  async getTrustScore(entityId: string, entityType: EntityType): Promise<TrustScoreResult | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/trust/${entityId}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        console.warn(`[TrustEngine] Failed to fetch trust score for ${entityId}: ${response.status}`);
        return null;
      }

      const data: TrustEngineResponse = await response.json();
      if (data.success && data.data) {
        return {
          score: data.data.score,
          tier: data.data.tier,
          factors: data.data.factors,
          verified: data.data.verified,
          lastVerified: data.data.lastVerified,
        };
      }

      return null;
    } catch (error) {
      console.warn(`[TrustEngine] Error fetching trust score for ${entityId}:`, error);
      return null;
    }
  }

  async calculateTrustScore(request: TrustEngineRequest): Promise<TrustScoreResult | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/v1/trust/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        console.warn(`[TrustEngine] Failed to calculate trust score: ${response.status}`);
        return this.calculateLocalTrustScore(request);
      }

      const data: TrustEngineResponse = await response.json();
      if (data.success && data.data) {
        return {
          score: data.data.score,
          tier: data.data.tier,
          factors: data.data.factors,
          verified: data.data.verified,
          lastVerified: data.data.lastVerified,
        };
      }

      return this.calculateLocalTrustScore(request);
    } catch (error) {
      console.warn(`[TrustEngine] Error calculating trust score:`, error);
      return this.calculateLocalTrustScore(request);
    }
  }

  private calculateLocalTrustScore(request: TrustEngineRequest): TrustScoreResult {
    const factors: TrustFactor[] = [];
    let totalScore = 0;
    let totalWeight = 0;

    // Review count factor
    const reviewCountScore = Math.min(request.reviewCount / 100, 1) * 100;
    factors.push({ name: 'review_volume', weight: 0.2, score: reviewCountScore, impact: 'positive' });
    totalScore += reviewCountScore * 0.2;
    totalWeight += 0.2;

    // Average rating factor
    factors.push({ name: 'average_rating', weight: 0.3, score: request.averageRating * 20, impact: request.averageRating >= 3.5 ? 'positive' : 'negative' });
    totalScore += request.averageRating * 20 * 0.3;
    totalWeight += 0.3;

    // Verified reviews factor
    const verifiedRatio = request.reviewCount > 0 ? request.verifiedReviews / request.reviewCount : 0;
    factors.push({ name: 'verified_ratio', weight: 0.3, score: verifiedRatio * 100, impact: verifiedRatio >= 0.5 ? 'positive' : 'neutral' });
    totalScore += verifiedRatio * 100 * 0.3;
    totalWeight += 0.3;

    // Sentiment factor
    const sentimentScore = (request.sentimentScore + 1) * 50; // Convert -1 to 1 range to 0 to 100
    factors.push({ name: 'sentiment', weight: 0.2, score: sentimentScore, impact: request.sentimentScore >= 0 ? 'positive' : 'negative' });
    totalScore += sentimentScore * 0.2;
    totalWeight += 0.2;

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

    return {
      score: Math.round(finalScore * 100) / 100,
      tier: this.determineTier(finalScore),
      factors,
      verified: verifiedRatio >= 0.5,
      lastVerified: new Date().toISOString(),
    };
  }

  private determineTier(score: number): TrustTier {
    if (score >= 90) return 'platinum';
    if (score >= 75) return 'gold';
    if (score >= 60) return 'silver';
    if (score >= 40) return 'bronze';
    return 'unverified';
  }

  private async fetchWithTimeout(url: string, options: RequestInit, attempt: number = 0): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (attempt < this.retryAttempts && (error instanceof Error && error.name === 'AbortError')) {
        console.warn(`[TrustEngine] Retry attempt ${attempt + 1} for ${url}`);
        return this.fetchWithTimeout(url, options, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  isAvailable(): boolean {
    // Simple check - in production, this would ping the service
    return true;
  }
}

export const trustEngineClient = new TrustEngineClient();
