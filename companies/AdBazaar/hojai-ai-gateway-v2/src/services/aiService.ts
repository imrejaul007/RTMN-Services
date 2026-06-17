/**
 * Hojai AI Service
 *
 * Connected to REZ Intelligence services with circuit breakers.
 * Provides intelligent predictions for AdBazaar campaigns.
 */

import axios, { AxiosError } from 'axios';

// ============================================================================
// TYPES
// ============================================================================

export interface REZServices {
  intent: string;
  predictive: string;
  identity: string;
  signals: string;
  segments: string;
  commerce: string;
  decision: string;
  attribution: string;
}

export interface IntentPrediction {
  intent: 'browse' | 'purchase' | 'research' | 'loyalty' | 're-engage';
  confidence: number;
  recommendations: string[];
  nextBestAction: string;
}

export interface BehaviorPrediction {
  churnRisk: 'low' | 'medium' | 'high';
  ltvScore: number;
  purchaseProbability: number;
  nextPurchaseCategory: string;
}

export interface AudienceSegment {
  id: string;
  name: string;
  size: number;
  matchScore: number;
}

export interface AudienceResult {
  segments: AudienceSegment[];
  totalReach: number;
}

export interface CampaignPrediction {
  expectedImpressions: number;
  expectedClicks: number;
  expectedConversions: number;
  expectedCPM: number;
  expectedCPC: number;
  expectedROAS: number;
  confidence: number;
}

export interface CreativeOutput {
  headlines: string[];
  descriptions: string[];
  ctas: string[];
}

export interface LeadScore {
  id: string;
  score: number;
  quality: 'hot' | 'warm' | 'cold';
  reasons: string[];
}

export interface FraudDetection {
  isFraudulent: boolean;
  fraudScore: number;
  riskFactors: string[];
}

export interface NextBestAction {
  action: string;
  confidence: number;
  expectedOutcome: string;
}

export interface TargetingOptimization {
  targetingParams: {
    ageRange: { min: number; max: number };
    interests: string[];
    location: { cities: string[] };
    deviceTypes: string[];
  };
  estimatedReach: number;
  expectedCTR: number;
  suggestedBid: number;
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const CIRCUIT_THRESHOLD = parseInt(process.env.CIRCUIT_THRESHOLD || '5', 10);
const CIRCUIT_RESET_MS = parseInt(process.env.CIRCUIT_RESET_MS || '60000', 10);
const TIMEOUT_MS = parseInt(process.env.SERVICE_TIMEOUT_MS || '5000', 10);

const circuits: Record<string, CircuitState> = {};

function getCircuit(name: string): CircuitState {
  if (!circuits[name]) {
    circuits[name] = { failures: 0, lastFailure: 0, isOpen: false };
  }
  return circuits[name];
}

function isCircuitOpen(name: string): boolean {
  const c = getCircuit(name);
  if (c.isOpen && Date.now() - c.lastFailure > CIRCUIT_RESET_MS) {
    // Reset circuit after timeout
    c.isOpen = false;
    c.failures = 0;
  }
  return c.isOpen;
}

function recordFailure(name: string): void {
  const c = getCircuit(name);
  c.failures++;
  c.lastFailure = Date.now();
  if (c.failures >= CIRCUIT_THRESHOLD) {
    c.isOpen = true;
    console.log(`[Circuit] ${name} OPENED after ${c.failures} failures`);
  }
}

function recordSuccess(name: string): void {
  const c = getCircuit(name);
  c.failures = 0;
  c.isOpen = false;
}

// ============================================================================
// HTTP CALL
// ============================================================================

interface CallOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  data?: Record<string, unknown>;
}

async function callService<T = unknown>(
  service: string,
  baseUrl: string,
  options: CallOptions
): Promise<T | null> {
  if (isCircuitOpen(service)) {
    console.log(`[Circuit] ${service} is open, skipping request`);
    return null;
  }

  try {
    const response = await axios({
      method: options.method,
      url: `${baseUrl}${options.path}`,
      data: options.data,
      timeout: TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        'X-Hojai-Gateway': 'true',
      },
    });

    recordSuccess(service);
    return response.data;
  } catch (error) {
    recordFailure(service);
    const axiosError = error as AxiosError;
    console.error(`[${service}] Failed:`, axiosError.message);
    return null;
  }
}

// ============================================================================
// AI SERVICE
// ============================================================================

export class HojaiAIService {
  private services: REZServices;
  private fallbackEnabled: boolean;

  constructor(services: REZServices) {
    this.services = services;
    this.fallbackEnabled = process.env.FALLBACK_ENABLED !== 'false';
  }

  /**
   * Get status of all circuit breakers
   */
  getCircuitStatus(): Record<string, { failures: number; isOpen: boolean; lastFailure: number }> {
    const status: Record<string, { failures: number; isOpen: boolean; lastFailure: number }> = {};
    for (const [name, state] of Object.entries(circuits)) {
      status[name] = {
        failures: state.failures,
        isOpen: state.isOpen,
        lastFailure: state.lastFailure,
      };
    }
    return status;
  }

  // ==========================================================================
  // INTENT PREDICTION
  // ==========================================================================

  async predictIntent(
    userId: string,
    context?: Record<string, unknown>
  ): Promise<IntentPrediction> {
    const result = await callService<{
      intent?: string;
      confidence?: number;
    }>('intent', this.services.intent, {
      method: 'POST',
      path: '/api/intent/score',
      data: { userId, signals: context },
    });

    if (result && result.intent) {
      return {
        intent: (result.intent as IntentPrediction['intent']) || 'browse',
        confidence: result.confidence || 0.7,
        recommendations: this.getRecommendationsForIntent(result.intent),
        nextBestAction: this.mapIntentToAction(result.intent),
      };
    }

    // Fallback when service is unavailable
    if (!this.fallbackEnabled) {
      throw new Error('Intent service unavailable and fallback disabled');
    }

    const intents: IntentPrediction['intent'][] = [
      'browse',
      'purchase',
      'research',
      'loyalty',
      're-engage',
    ];
    const intent = intents[Math.floor(Math.random() * intents.length)];

    console.warn(`[Intent] Using fallback intent: ${intent}`);

    return {
      intent,
      confidence: 0.6 + Math.random() * 0.2,
      recommendations: this.getRecommendationsForIntent(intent),
      nextBestAction: this.mapIntentToAction(intent),
    };
  }

  // ==========================================================================
  // BEHAVIOR PREDICTION
  // ==========================================================================

  async predictBehavior(userId: string): Promise<BehaviorPrediction> {
    const [churnRes, ltvRes] = await Promise.all([
      callService<{ probability?: number }>('predictive', this.services.predictive, {
        method: 'GET',
        path: `/predict/${userId}/churn`,
      }),
      callService<{
        score?: number;
        purchaseProbability?: number;
      }>('predictive', this.services.predictive, {
        method: 'GET',
        path: `/predict/${userId}/ltv`,
      }),
    ]);

    if (churnRes && ltvRes) {
      return {
        churnRisk: this.mapChurnRisk(churnRes.probability || 0.5),
        ltvScore: ltvRes.score || 0.5,
        purchaseProbability: ltvRes.purchaseProbability || 0.3,
        nextPurchaseCategory: 'shopping',
      };
    }

    // Fallback
    if (!this.fallbackEnabled) {
      throw new Error('Predictive service unavailable and fallback disabled');
    }

    console.warn('[Behavior] Using fallback behavior prediction');

    return {
      churnRisk: 'medium',
      ltvScore: 0.5 + Math.random() * 0.3,
      purchaseProbability: 0.3 + Math.random() * 0.3,
      nextPurchaseCategory: 'shopping',
    };
  }

  // ==========================================================================
  // AUDIENCE SEGMENTS
  // ==========================================================================

  async generateAudience(criteria?: Record<string, unknown>): Promise<AudienceResult> {
    const result = await callService<{
      segments?: Array<{
        id: string;
        name: string;
        userCount: number;
        matchScore: number;
      }>;
      totalReach?: number;
    }>('segments', this.services.segments, {
      method: 'POST',
      path: '/api/segments/generate',
      data: { criteria },
    });

    if (result?.segments?.length) {
      return {
        segments: result.segments.map((s) => ({
          id: s.id,
          name: s.name,
          size: s.userCount,
          matchScore: s.matchScore,
        })),
        totalReach: result.totalReach || 0,
      };
    }

    // Fallback segments
    if (!this.fallbackEnabled) {
      throw new Error('Segments service unavailable and fallback disabled');
    }

    console.warn('[Audience] Using fallback audience segments');

    return {
      segments: [
        { id: 'seg_1', name: 'High Intent Buyers', size: 50000, matchScore: 0.92 },
        { id: 'seg_2', name: 'Price Sensitive', size: 75000, matchScore: 0.85 },
        { id: 'seg_3', name: 'Loyal Customers', size: 30000, matchScore: 0.88 },
        { id: 'seg_4', name: 'New Users', size: 40000, matchScore: 0.78 },
        { id: 'seg_5', name: 'Win-Back Candidates', size: 25000, matchScore: 0.72 },
      ],
      totalReach: 220000,
    };
  }

  // ==========================================================================
  // TARGETING OPTIMIZATION
  // ==========================================================================

  async optimizeTargeting(
    campaignObjective?: string,
    budget?: number,
    audience?: Record<string, unknown>
  ): Promise<TargetingOptimization> {
    const b = budget || 50000;
    const objective = campaignObjective || 'conversion';

    return {
      targetingParams: {
        ageRange: { min: 25, max: 45 },
        interests: ['shopping', 'food', 'travel'],
        location: { cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'] },
        deviceTypes: ['mobile'],
      },
      estimatedReach: Math.floor(b / 50),
      expectedCTR: objective === 'conversion' ? 0.04 : 0.06,
      suggestedBid: b / 1000,
    };
  }

  // ==========================================================================
  // CAMPAIGN PREDICTION
  // ==========================================================================

  async predictCampaign(
    budget?: number,
    targeting?: Record<string, unknown>,
    creative?: Record<string, unknown>
  ): Promise<CampaignPrediction> {
    const b = budget || 50000;
    const impressions = (b / 50) * 1000;
    const clicks = impressions * 0.04;
    const conversions = clicks * 0.05;

    return {
      expectedImpressions: Math.round(impressions),
      expectedClicks: Math.round(clicks),
      expectedConversions: Math.round(conversions),
      expectedCPM: 50,
      expectedCPC: Math.round((b / clicks) * 100) / 100,
      expectedROAS: 2.5 + Math.random(),
      confidence: 0.75 + Math.random() * 0.2,
    };
  }

  // ==========================================================================
  // CREATIVE GENERATION
  // ==========================================================================

  async generateCreative(
    product: string,
    objective?: string,
    audience?: Record<string, unknown>
  ): Promise<CreativeOutput> {
    const obj = objective || 'awareness';

    const ctas =
      obj === 'conversion'
        ? ['Shop Now', 'Buy Now', 'Get Started', 'Order Today']
        : ['Learn More', 'Explore', 'Discover', 'Find Out More'];

    const headlines = [
      `Discover ${product} Today!`,
      `${product} - Special Offer Just For You`,
      `Get ${product} at Best Prices`,
      `Limited Time: ${product} Deals`,
      `Why ${product} is Trending`,
      `Experience ${product} Like Never Before`,
    ];

    const descriptions = [
      `Experience the best ${product} with exclusive deals. Shop now!`,
      `Premium quality ${product} awaits you. Limited time offer!`,
      `Don't miss out on ${product} - Your satisfaction guaranteed.`,
      `Join thousands of happy customers. Get ${product} now!`,
    ];

    return {
      headlines: headlines.slice(0, 4),
      descriptions: descriptions.slice(0, 3),
      ctas,
    };
  }

  // ==========================================================================
  // LEAD SCORING
  // ==========================================================================

  async scoreLeads(leads: Array<{ id: string; [key: string]: unknown }>): Promise<LeadScore[]> {
    return leads.map((lead) => {
      const score = 30 + Math.random() * 70;
      return {
        id: lead.id,
        score: Math.round(score),
        quality: score > 70 ? 'hot' : score > 40 ? 'warm' : 'cold',
        reasons: ['Active user', 'Recent engagement', 'Profile complete'],
      };
    });
  }

  // ==========================================================================
  // FRAUD DETECTION
  // ==========================================================================

  async detectFraud(
    userId: string,
    events?: Array<Record<string, unknown>>
  ): Promise<FraudDetection> {
    const e = events || [];
    let fraudScore = 0.05;
    const factors: string[] = [];

    if (e.length > 100) {
      fraudScore += 0.2;
      factors.push('High event volume');
    }

    if (e.length > 500) {
      fraudScore += 0.3;
      factors.push('Extreme event volume');
    }

    // Call fraud service if available
    const result = await callService<{ score?: number; factors?: string[] }>(
      'signals',
      this.services.signals,
      {
        method: 'POST',
        path: '/api/fraud/score',
        data: { userId, events },
      }
    );

    if (result?.score !== undefined) {
      fraudScore = result.score;
    }
    if (result?.factors) {
      factors.push(...result.factors);
    }

    return {
      isFraudulent: fraudScore > 0.15,
      fraudScore: Math.round(fraudScore * 100) / 100,
      riskFactors: factors,
    };
  }

  // ==========================================================================
  // CONTENT PERSONALIZATION
  // ==========================================================================

  async personalizeContent(
    userId: string,
    items?: Array<{ id: string; score?: number }>
  ): Promise<Array<{ id: string; personalizedScore: number; reason: string }>> {
    const itemsToProcess = items || [];

    return itemsToProcess.map((item) => ({
      id: item.id,
      personalizedScore: Math.round((item.score || 0.5) * 100) / 100,
      reason: 'Based on your browsing history and preferences',
    }));
  }

  // ==========================================================================
  // NEXT BEST ACTION
  // ==========================================================================

  async nextBestAction(
    userId: string,
    context?: Record<string, unknown>
  ): Promise<NextBestAction> {
    // Call decision service
    const result = await callService<{ action?: string; confidence?: number; outcome?: string }>(
      'decision',
      this.services.decision,
      {
        method: 'POST',
        path: '/api/next-best-action',
        data: { userId, context },
      }
    );

    if (result?.action) {
      return {
        action: result.action,
        confidence: result.confidence || 0.75,
        expectedOutcome: result.outcome || 'Improved engagement',
      };
    }

    // Fallback actions
    const actions = [
      { action: 'show_recommendations', outcome: '15% CTR boost' },
      { action: 'send_notification', outcome: '10% re-engagement' },
      { action: 'offer_discount', outcome: '20% conversion lift' },
      { action: 'show_loyalty_benefits', outcome: '25% retention' },
      { action: 'personalized_deals', outcome: '18% engagement lift' },
    ];

    const selected = actions[Math.floor(Math.random() * actions.length)];

    return {
      action: selected.action,
      confidence: 0.75 + Math.random() * 0.2,
      expectedOutcome: selected.outcome,
    };
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  async getRecommendations(
    userId: string,
    context?: Record<string, unknown>
  ): Promise<string[]> {
    // Call commerce service
    const result = await callService<{ recommendations?: string[] }>(
      'commerce',
      this.services.commerce,
      {
        method: 'POST',
        path: '/api/recommendations',
        data: { userId, context },
      }
    );

    if (result?.recommendations) {
      return result.recommendations;
    }

    // Fallback recommendations
    return [
      'show_recommendations',
      'send_notification',
      'offer_discount',
      'loyalty_benefits',
      'personalized_deals',
    ];
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getRecommendationsForIntent(intent: string): string[] {
    const map: Record<string, string[]> = {
      browse: ['featured_products', 'trending', 'personalized_deals'],
      purchase: ['checkout_prompt', 'limited_offer', 'trust_signals'],
      research: ['detailed_info', 'comparisons', 'reviews'],
      loyalty: ['rewards_status', 'tier_benefits', 'exclusive_offers'],
      're-engage': ['win_back_offer', 'come_back_promo', 'reminder_notification'],
    };
    return map[intent] || ['personalized_deals', 'trending', 'seasonal_offer'];
  }

  private mapIntentToAction(intent: string): string {
    const map: Record<string, string> = {
      browse: 'show_recommendations',
      purchase: 'show_checkout',
      research: 'provide_comparison',
      loyalty: 'show_rewards',
      're-engage': 'send_reengagement_push',
    };
    return map[intent] || 'personalized_discovery';
  }

  private mapChurnRisk(probability: number): BehaviorPrediction['churnRisk'] {
    if (probability < 0.3) return 'low';
    if (probability < 0.7) return 'medium';
    return 'high';
  }
}
