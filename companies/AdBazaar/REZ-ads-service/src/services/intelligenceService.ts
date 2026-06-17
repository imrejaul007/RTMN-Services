/**
 * Intelligence Service for REZ-ads-service
 *
 * Connects ad serving to all audience intelligence services.
 * Provides unified access to:
 * - Audience Intelligence (4805)
 * - HOJAI AI Gateway (4560)
 * - Intent Signals (4800-4802)
 * - CDP (4901)
 */

import axios, { AxiosInstance } from 'axios';
import { INTELLIGENCE_SERVICES } from '../config/database.js';
import { logger } from '../utils/logger.js';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token';

// Create axios clients
const createClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      'X-Internal-Service': 'rez-ads-service',
      'X-Internal-Token': INTERNAL_TOKEN,
      'Content-Type': 'application/json',
    },
  });
};

const clients = {
  hojai: createClient(INTELLIGENCE_SERVICES.HOJAI_GATEWAY_URL),
  audience: createClient(INTELLIGENCE_SERVICES.AUDIENCE_INTELLIGENCE_URL),
  intent: createClient(INTELLIGENCE_SERVICES.INTENT_AGGREGATOR_URL),
  intentPrediction: createClient(INTELLIGENCE_SERVICES.INTENT_PREDICTION_URL),
  cdp: createClient(INTELLIGENCE_SERVICES.CDP_URL),
  integration: createClient(INTELLIGENCE_SERVICES.INTEGRATION_SERVICE_URL),
};

// ============================================================================
// AUDIENCE TARGETING
// ============================================================================

export interface AudienceSegment {
  segmentId: string;
  name: string;
  score: number;
}

export interface TargetingContext {
  userId?: string;
  city?: string;
  area?: string;
  category?: string;
  demographics?: {
    ageGroup?: string;
    gender?: string;
    incomeLevel?: string;
  };
}

/**
 * Get relevant audience segments for ad targeting
 */
export async function getAudienceSegments(context: TargetingContext): Promise<AudienceSegment[]> {
  try {
    // Try audience intelligence first
    const response = await clients.audience.get('/api/segments', {
      params: {
        category: context.category,
        intent: 'high',
      },
    });
    return response.data.data?.segments || [];
  } catch (error) {
    logger.warn('[Intelligence] Failed to get audience segments', { error });
    return [];
  }
}

/**
 * Get user intent score for targeting
 */
export async function getUserIntent(userId: string, category?: string): Promise<{
  score: number;
  intent: string;
  confidence: number;
} | null> {
  try {
    const response = await clients.hojai.post('/api/intent/predict', {
      userId,
      context: { category },
    });
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Failed to get user intent', { error });
    return null;
  }
}

/**
 * Get unified user profile
 */
export async function getUserProfile(userId: string): Promise<Record<string, unknown> | null> {
  try {
    // Try integration service for unified profile
    const response = await clients.integration.get(`/unified/profile/${userId}`);
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Failed to get user profile', { error });
    return null;
  }
}

// ============================================================================
// CAMPAIGN OPTIMIZATION
// ============================================================================

/**
 * Predict campaign performance
 */
export async function predictCampaignPerformance(campaign: {
  targeting: TargetingContext;
  budget: number;
  duration: number;
}): Promise<{
  expectedImpressions: number;
  expectedClicks: number;
  expectedConversions: number;
  expectedCPM: number;
  expectedROAS: number;
  confidence: number;
}> {
  try {
    const response = await clients.hojai.post('/api/campaign/predict', campaign);
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Failed to predict campaign', { error });
    // Return conservative estimates
    return {
      expectedImpressions: campaign.budget / 50 * 1000,
      expectedClicks: campaign.budget / 50 * 1000 * 0.04,
      expectedConversions: campaign.budget / 50 * 1000 * 0.04 * 0.05,
      expectedCPM: 50,
      expectedROAS: 2.0,
      confidence: 0.5,
    };
  }
}

/**
 * Get AI targeting recommendations
 */
export async function getTargetingRecommendations(criteria: {
  campaignObjective: string;
  budget: number;
  category?: string;
}): Promise<{
  cities: { name: string; priority: string }[];
  screenTypes: { type: string; weight: number }[];
  ageGroups: string[];
  bestTime: { dayPart: string; hours: string[] };
}> {
  try {
    const response = await clients.hojai.post('/api/targeting/suggest', criteria);
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Failed to get targeting recommendations', { error });
    return {
      cities: [{ name: 'Mumbai', priority: 'high' }],
      screenTypes: [{ type: 'bus_shelter', weight: 0.4 }],
      ageGroups: ['25-34', '35-44'],
      bestTime: { dayPart: 'evening', hours: ['18:00-21:00'] },
    };
  }
}

// ============================================================================
// FRAUD DETECTION
// ============================================================================

/**
 * Check for fraud signals
 */
export async function checkFraudRisk(userId: string, context: {
  ip?: string;
  userAgent?: string;
  clickHistory?: number;
}): Promise<{
  isFraud: boolean;
  riskScore: number;
  reasons: string[];
}> {
  try {
    const response = await clients.hojai.post('/api/fraud/detect', {
      userId,
      ...context,
    });
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Fraud check failed', { error });
    return { isFraud: false, riskScore: 0, reasons: [] };
  }
}

// ============================================================================
// LOOKALIKE AUDIENCES
// ============================================================================

/**
 * Generate lookalike audience
 */
export async function generateLookalike(sourceSegmentId: string, targetSize: number): Promise<{
  lookalikeId: string;
  size: number;
  similarity: number;
}> {
  try {
    const response = await clients.intentPrediction.post('/api/predict/lookalike', {
      sourceSegmentId,
      targetSize,
    });
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Lookalike generation failed', { error });
    return {
      lookalikeId: `lookalike_${Date.now()}`,
      size: targetSize,
      similarity: 0.75,
    };
  }
}

// ============================================================================
// RE-ENGAGEMENT
// ============================================================================

/**
 * Get re-engagement candidates
 */
export async function getReEngagementCandidates(criteria: {
  category?: string;
  minDormancyDays?: number;
  limit?: number;
}): Promise<{
  userId: string;
  dormancyScore: number;
  recommendedAction: string;
}[]> {
  try {
    const response = await clients.intentPrediction.get('/api/predict/revival-candidates', {
      params: criteria,
    });
    return response.data.data?.candidates || [];
  } catch (error) {
    logger.warn('[Intelligence] Re-engagement candidates failed', { error });
    return [];
  }
}

// ============================================================================
// PRODUCT RECOMMENDATIONS
// ============================================================================

/**
 * Get product recommendations for user
 */
export async function getProductRecommendations(userId: string, context: {
  category?: string;
  limit?: number;
}): Promise<{
  productId: string;
  score: number;
  reason: string;
}[]> {
  try {
    const response = await clients.hojai.post('/api/recommendations', {
      userId,
      ...context,
    });
    return response.data.data?.recommendations || [];
  } catch (error) {
    logger.warn('[Intelligence] Product recommendations failed', { error });
    return [];
  }
}

// ============================================================================
// LEAD SCORING
// ============================================================================

/**
 * Score a lead
 */
export async function scoreLead(lead: {
  userId: string;
  source: string;
  interactions: number;
}): Promise<{
  score: number;
  grade: string;
  recommendedAction: string;
}> {
  try {
    const response = await clients.hojai.post('/api/leads/score', lead);
    return response.data.data;
  } catch (error) {
    logger.warn('[Intelligence] Lead scoring failed', { error });
    return {
      score: 50,
      grade: 'B',
      recommendedAction: 'nurture',
    };
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export async function checkIntelligenceHealth(): Promise<{
  hojai: boolean;
  audience: boolean;
  intent: boolean;
  cdp: boolean;
}> {
  const results = {
    hojai: false,
    audience: false,
    intent: false,
    cdp: false,
  };

  await Promise.allSettled([
    clients.hojai.get('/health/live').then(() => { results.hojai = true; }),
    clients.audience.get('/health/live').then(() => { results.audience = true; }),
    clients.intent.get('/health/live').then(() => { results.intent = true; }),
    clients.cdp.get('/health/live').then(() => { results.cdp = true; }),
  ]);

  return results;
}
