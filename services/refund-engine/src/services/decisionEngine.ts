import axios from 'axios';
import { logger } from '../utils/logger';

const DECISION_ENGINE_URL = process.env.DECISION_ENGINE_URL || 'http://localhost:4240';

interface DecisionRequest {
  type: string;
  action: string;
  customerId: string;
  amount: number;
  channel?: string;
  reason?: string;
  trustScore?: number;
  [key: string]: unknown;
}

interface DecisionResponse {
  approved: boolean;
  reason: string;
  riskScore?: number;
  flags?: string[];
  confidence?: number;
  decisionId?: string;
}

export class DecisionEngine {
  private baseUrl: string;
  private cache: Map<string, { response: DecisionResponse; expiry: number }> = new Map();

  constructor() {
    this.baseUrl = DECISION_ENGINE_URL;
  }

  /**
   * Evaluate a decision request
   */
  async evaluate(request: DecisionRequest): Promise<DecisionResponse> {
    try {
      const cacheKey = JSON.stringify(request);

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        logger.debug('Decision cache hit');
        return cached.response;
      }

      // Call decision engine
      const response = await axios.post(
        `${this.baseUrl}/api/decisions/evaluate`,
        request,
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const decision: DecisionResponse = response.data;

      // Cache successful decisions for 5 minutes
      if (decision.approved) {
        this.cache.set(cacheKey, {
          response: decision,
          expiry: Date.now() + 5 * 60 * 1000
        });
      }

      return decision;
    } catch (error) {
      logger.warn('Decision engine unavailable, using fallback logic:', error);

      // Fallback: use local trust score based logic
      return this.fallbackDecision(request);
    }
  }

  /**
   * Fallback decision logic when decision engine is unavailable
   */
  private fallbackDecision(request: DecisionRequest): DecisionResponse {
    const trustScore = request.trustScore || 500;

    // High trust score + low amount = approve
    if (trustScore >= 750 && request.amount <= 500) {
      return {
        approved: true,
        reason: 'Auto-approved: High trust score and within threshold',
        riskScore: 0.1,
        confidence: 0.85
      };
    }

    // Medium trust score = review
    if (trustScore >= 500) {
      return {
        approved: true,
        reason: 'Approved with review flag',
        riskScore: 0.3,
        flags: ['manual_review_required'],
        confidence: 0.7
      };
    }

    // Low trust score = decline
    return {
      approved: false,
      reason: 'Declined: Low trust score requires manual review',
      riskScore: 0.8,
      confidence: 0.9
    };
  }

  /**
   * Check for fraud patterns
   */
  async checkFraud(customerId: string, amount: number): Promise<{
    isFraudulent: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/fraud/check/${customerId}`,
        {
          params: { amount },
          timeout: 3000
        }
      );

      return response.data;
    } catch (error) {
      logger.warn('Fraud check failed:', error);
      return {
        isFraudulent: false,
        riskLevel: 'low',
        factors: ['Unable to verify - service unavailable']
      };
    }
  }

  /**
   * Get customer risk profile
   */
  async getRiskProfile(customerId: string): Promise<{
    score: number;
    tier: 'excellent' | 'good' | 'fair' | 'poor';
    factors: Record<string, number>;
  }> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/risk/profile/${customerId}`,
        { timeout: 3000 }
      );

      return response.data;
    } catch (error) {
      logger.warn('Risk profile fetch failed:', error);
      return {
        score: 500,
        tier: 'fair',
        factors: {}
      };
    }
  }

  /**
   * Clear decision cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Decision cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await axios.get(`${this.baseUrl}/health`, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }
}

export const decisionEngine = new DecisionEngine();
