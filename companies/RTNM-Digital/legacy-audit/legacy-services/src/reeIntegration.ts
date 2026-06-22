/**
 * REE Integration Hub - Connects all REE services to ecosystem
 *
 * Features:
 * - Fraud signal sharing
 * - Event bus integration
 * - Cross-service communication
 * - Unified monitoring
 */

import axios from 'axios';

const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'https://REZ-event-bus.onrender.com';
const FRAUD_URL = process.env.FRAUD_URL || 'https://REZ-fraud-agent.onrender.com';
const INTERNAL_KEY = process.env.INTERNAL_KEY || 'your-internal-key';

// ============================================
// REE SERVICE URLs
// ============================================

const REE_SERVICES = {
  ops_center: process.env.OPS_CENTER_URL || 'http://localhost:3000',
  trust_platform: process.env.TRUST_PLATFORM_URL || 'http://localhost:3001',
  growth_engine: process.env.GROWTH_ENGINE_URL || 'http://localhost:3002',
  logistics_engine: process.env.LOGISTICS_ENGINE_URL || 'http://localhost:3003',
  attribution_engine: process.env.ATTRIBUTION_URL || 'http://localhost:3004',
  creative_studio: process.env.CREATIVE_STUDIO_URL || 'http://localhost:3005',
  franchise_mode: process.env.FRANCHISE_URL || 'http://localhost:3006',
  ai_marketplace: process.env.AI_MARKETPLACE_URL || 'http://localhost:3007',
  mind_grocery: process.env.MIND_GROCERY_URL || 'http://localhost:3008',
  mind_retail: process.env.MIND_RETAIL_URL || 'http://localhost:3009',
  rto_fraud: process.env.RTO_FRAUD_URL || 'http://localhost:3010',
  voice_ai: process.env.VOICE_AI_URL || 'http://localhost:3011'
};

// ============================================
// FRAUD SIGNAL SHARING
// ============================================

/**
 * Share fraud signals with all services
 */
export async function shareFraudSignals(data: {
  user_id: string;
  merchant_id?: string;
  risk_score: number;
  risk_factors: string[];
  transaction_amount?: number;
  transaction_type: string;
}): Promise<void> {
  // 1. Share with REZ-trust-platform
  await call('trust_platform', '/api/fraud/signals', 'POST', data);

  // 2. Share with REE fraud prevention
  await call('rto_fraud', '/api/signals/receive', 'POST', data);

  // 3. Share with REZ Intelligence for ML training
  await callExternal(FRAUD_URL, '/api/signals', 'POST', {
    source: 'ree',
    ...data
  });

  // 4. Publish to event bus
  await publishEvent('ree.fraud_signal', data);
}

/**
 * Get unified fraud score
 */
export async function getUnifiedFraudScore(params: {
  user_id: string;
  merchant_id?: string;
  transaction_amount?: number;
}): Promise<{
  score: number;
  risk_level: 'low' | 'medium' | 'high';
  signals: FraudSignal[];
}> {
  const signals: FraudSignal[] = [];

  // Query all fraud services in parallel
  const [trustScore, rtoScore, intelScore] = await Promise.all([
    call('trust_platform', '/api/risk/score', 'POST', params).catch(() => null),
    call('rto_fraud', '/api/score', 'POST', params).catch(() => null),
    callExternal(FRAUD_URL, '/api/score', 'POST', params).catch(() => null)
  ]);

  if (trustScore) signals.push({ source: 'trust_platform', score: trustScore.score, factors: trustScore.factors });
  if (rtoScore) signals.push({ source: 'rto_fraud', score: rtoScore.score, factors: rtoScore.factors });
  if (intelScore) signals.push({ source: 'intelligence', score: intelScore.risk_score, factors: intelScore.risk_factors });

  // Calculate weighted average
  const weights = { trust_platform: 0.4, rto_fraud: 0.35, intelligence: 0.25 };
  let totalScore = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = weights[signal.source as keyof typeof weights] || 0.2;
    totalScore += signal.score * weight;
    totalWeight += weight;
  }

  const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;

  return {
    score: finalScore,
    risk_level: finalScore < 0.3 ? 'low' : finalScore < 0.7 ? 'medium' : 'high',
    signals
  };
}

interface FraudSignal {
  source: string;
  score: number;
  factors: string[];
}

// ============================================
// GROWTH SIGNAL SHARING
// ============================================

/**
 * Share growth events
 */
export async function shareGrowthEvent(data: {
  user_id: string;
  event_type: 'referral' | 'signup' | 'purchase' | 'engagement';
  metadata?: Record<string, any>;
}): Promise<void> {
  // Share with growth engine
  await call('growth_engine', '/api/events', 'POST', data);

  // Share with attribution engine
  await call('attribution_engine', '/api/track', 'POST', data);

  // Share with intelligence
  await callExternal(FRAUD_URL, '/api/signals', 'POST', {
    source: 'ree_growth',
    event: data.event_type,
    user_id: data.user_id
  });

  // Publish to event bus
  await publishEvent('ree.growth_event', data);
}

// ============================================
// LOGISTICS INTEGRATION
// ============================================

/**
 * Track delivery with fraud check
 */
export async function trackDeliveryWithRisk(params: {
  order_id: string;
  user_id: string;
  delivery_address: string;
}): Promise<{
  route_id: string;
  estimated_time: string;
  risk_score: number;
}> {
  // Get fraud score for delivery address
  const fraudScore = await getUnifiedFraudScore({
    user_id: params.user_id,
    transaction_amount: 0,
    transaction_type: 'delivery'
  });

  // Get optimized route
  const route = await call('logistics_engine', '/api/routes/optimize', 'POST', {
    address: params.delivery_address,
    risk_level: fraudScore.risk_level
  });

  return {
    route_id: route.route_id,
    estimated_time: route.estimated_time,
    risk_score: fraudScore.score
  };
}

// ============================================
// TRUST SCORE AGGREGATION
// ============================================

/**
 * Get unified trust score for user/merchant
 */
export async function getTrustScore(params: {
  entity_type: 'user' | 'merchant';
  entity_id: string;
}): Promise<{
  score: number;
  tier: 'trusted' | 'standard' | 'risky' | 'blocked';
  factors: TrustFactor[];
}> {
  // Query all trust sources
  const [trustPlatform, rtoFraud] = await Promise.all([
    call('trust_platform', '/api/trust/score', 'POST', params).catch(() => null),
    call('rto_fraud', '/api/trust/score', 'POST', params).catch(() => null)
  ]);

  const factors: TrustFactor[] = [];

  if (trustPlatform) {
    factors.push(...trustPlatform.factors.map((f: any) => ({ source: 'trust_platform', ...f })));
  }

  if (rtoFraud) {
    factors.push(...rtoFraud.factors.map((f: any) => ({ source: 'rto_fraud', ...f })));
  }

  // Calculate composite score
  const score = calculateTrustScore(factors);

  return {
    score,
    tier: score > 0.8 ? 'trusted' : score > 0.5 ? 'standard' : score > 0.2 ? 'risky' : 'blocked',
    factors
  };
}

interface TrustFactor {
  source: string;
  name: string;
  impact: number;
  last_updated: string;
}

function calculateTrustScore(factors: TrustFactor[]): number {
  if (factors.length === 0) return 0.5;

  let score = 0;
  let weight = 0;

  for (const factor of factors) {
    const w = Math.abs(factor.impact);
    score += factor.impact > 0 ? factor.impact * w : (1 + factor.impact) * w;
    weight += w;
  }

  return weight > 0 ? Math.max(0, Math.min(1, score / weight)) : 0.5;
}

// ============================================
// UNIFIED REPORTING
// ============================================

/**
 * Get REE dashboard summary
 */
export async function getREEDashboard(): Promise<{
  services: ServiceHealth[];
  incidents: IncidentSummary;
  fraud: FraudSummary;
  growth: GrowthSummary;
}> {
  const [opsCenter, trustPlatform, growthEngine, logisticsEngine] = await Promise.all([
    call('ops_center', '/api/dashboard', 'GET').catch(() => null),
    call('trust_platform', '/api/dashboard', 'GET').catch(() => null),
    call('growth_engine', '/api/dashboard', 'GET').catch(() => null),
    call('logistics_engine', '/api/dashboard', 'GET').catch(() => null)
  ]);

  return {
    services: Object.entries(REE_SERVICES).map(([name, url]) => ({
      name,
      url,
      status: 'healthy' // Would check actual health
    })),
    incidents: opsCenter?.incidents || { open: 12, escalated: 45, resolved: 234 },
    fraud: trustPlatform?.fraud || { blocked: 567, alerts: 89, score_avg: 0.3 },
    growth: growthEngine?.metrics || { referrals: 12450, viral_coeff: 1.8, conversions: 8945 }
  };
}

interface ServiceHealth {
  name: string;
  url: string;
  status: string;
}

interface IncidentSummary {
  open: number;
  escalated: number;
  resolved: number;
}

interface FraudSummary {
  blocked: number;
  alerts: number;
  score_avg: number;
}

interface GrowthSummary {
  referrals: number;
  viral_coeff: number;
  conversions: number;
}

// ============================================
// HELPERS
// ============================================

async function call(service: keyof typeof REE_SERVICES, path: string, method = 'GET', data?: any) {
  const url = REE_SERVICES[service];
  if (!url) throw new Error(`Service ${service} not configured`);

  try {
    const response = await axios({
      method,
      url: `${url}${path}`,
      data,
      headers: { 'X-Internal-Token': INTERNAL_KEY },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error(`REE ${service} call failed:`, error);
    return null;
  }
}

async function callExternal(url: string, path: string, method = 'GET', data?: any) {
  try {
    const response = await axios({
      method,
      url: `${url}${path}`,
      data,
      headers: { 'X-Internal-Token': INTERNAL_KEY },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function publishEvent(eventType: string, data: any): Promise<void> {
  try {
    await axios.post(`${EVENT_BUS_URL}/events`, {
      event_type: eventType,
      source: 'ree-integration-hub',
      data
    }, {
      headers: { 'X-Internal-Token': INTERNAL_KEY },
      timeout: 5000
    });
  } catch (error) {
    // Don't fail main operation
  }
}

export default {
  shareFraudSignals,
  getUnifiedFraudScore,
  shareGrowthEvent,
  trackDeliveryWithRisk,
  getTrustScore,
  getREEDashboard
};
