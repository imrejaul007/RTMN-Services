/**
 * CorpID Cloud - Identity Twin Model
 * Digital twin of identity for simulation and prediction
 */

import { v4 as uuidv4 } from 'uuid';
import { getConsumerByUserId } from '../../../consumer/src/models/consumer.model.js';
import { getTrustScore } from '../../../trust/src/models/trust.model.js';

// ============ IN-MEMORY STORES ============

export const identityTwins = new Map(); // userId -> IdentityTwin
export const twinPredictions = new Map(); // predictionId -> Prediction
export const twinSimulations = new Map(); // simId -> Simulation

// ============ MODEL FACTORY ============

/**
 * Create or get identity twin
 */
export function getOrCreateTwin(userId) {
  let twin = identityTwins.get(userId);

  if (!twin) {
    twin = {
      id: `twin-${uuidv4().slice(0, 12)}`,
      userId,

      // Twin identity
      twinId: `identity-${userId}`,
      ownerId: userId,
      ownerType: 'user',

      // Twin profile (synthesized from data)
      profile: {
        demographics: {},
        psychographics: {},
        technographics: {}
      },

      // Behaviors
      behaviors: {
        loginPatterns: {},
        purchasePatterns: {},
        communicationPatterns: {},
        riskPatterns: {}
      },

      // Relationships
      relationships: {
        strongest: [],
        frequent: [],
        recent: []
      },

      // Preferences
      preferences: {
        explicit: {},
        inferred: {},
        confidence: {}
      },

      // Twin state
      state: {
        health: 50,
        risk: 50,
        engagement: 50,
        satisfaction: 50
      },

      // Predictions
      predictions: {
        churnRisk: 0,
        upsellPotential: 0,
        engagementForecast: {},
        lifetimeValue: 0
      },

      // Version
      version: 1,
      dataFreshness: 'realtime',
      lastSyncedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),

      createdAt: new Date().toISOString()
    };

    identityTwins.set(userId, twin);
  }

  return twin;
}

/**
 * Refresh twin from source data
 */
export function refreshTwin(userId) {
  const twin = getOrCreateTwin(userId);

  // Aggregate from consumer profile
  const consumer = getConsumerByUserId(userId);
  if (consumer) {
    twin.profile.demographics = {
      country: consumer.country,
      city: consumer.city,
      timezone: consumer.timezone,
      language: consumer.preferences?.language,
      currency: consumer.preferences?.currency
    };

    twin.profile.psychographics = {
      tier: consumer.rezProfile?.tier,
      engagement: consumer.activityCount > 10 ? 'high' : consumer.activityCount > 3 ? 'medium' : 'low'
    };

    twin.preferences.explicit = consumer.preferences || {};

    // Infer from behavior
    if (consumer.connectedAccounts?.length > 0) {
      twin.profile.technographics.connectivity = 'high';
    }
  }

  // Get trust score
  const trustScore = getTrustScore(userId);
  if (trustScore) {
    twin.state.health = trustScore.overallScore;
    twin.state.risk = 100 - trustScore.overallScore;
  }

  // Calculate derived metrics
  twin.predictions.lifetimeValue = calculateLTV(consumer);
  twin.predictions.churnRisk = calculateChurnRisk(consumer, trustScore);
  twin.predictions.upsellPotential = calculateUpsellPotential(consumer, trustScore);

  twin.version++;
  twin.lastSyncedAt = new Date().toISOString();
  twin.lastUpdated = new Date().toISOString();

  identityTwins.set(userId, twin);
  return twin;
}

function calculateLTV(consumer) {
  if (!consumer) return 0;
  const baseLTV = consumer.rezProfile?.lifetimeValue || 0;
  const tierMultiplier = {
    bronze: 1.0, silver: 1.5, gold: 2.0, platinum: 3.0
  }[consumer.rezProfile?.tier] || 1.0;

  return Math.round(baseLTV * tierMultiplier);
}

function calculateChurnRisk(consumer, trustScore) {
  let risk = 30; // Base

  if (consumer) {
    const daysSinceActivity = consumer.lastActivityAt
      ? Math.floor((Date.now() - new Date(consumer.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity > 30) risk += 30;
    else if (daysSinceActivity > 14) risk += 15;

    if (consumer.activityCount < 3) risk += 10;
  }

  if (trustScore && trustScore.overallScore < 40) risk += 20;

  return Math.min(100, risk);
}

function calculateUpsellPotential(consumer, trustScore) {
  let potential = 20; // Base

  if (consumer?.rezProfile?.tier === 'silver') potential += 30;
  if (consumer?.rezProfile?.tier === 'gold') potential += 20;

  if (consumer?.activityCount > 10) potential += 15;
  if (trustScore?.overallScore > 70) potential += 15;

  return Math.min(100, potential);
}

/**
 * Run simulation
 */
export function runSimulation(userId, scenario) {
  const twin = refreshTwin(userId);
  const simId = `sim-${uuidv4().slice(0, 12)}`;

  // Base values
  const baseline = {
    churnRisk: twin.predictions.churnRisk,
    ltv: twin.predictions.lifetimeValue,
    satisfaction: twin.state.satisfaction,
    engagement: twin.state.engagement
  };

  // Apply scenario modifications
  const result = {
    id: simId,
    userId,
    scenario: scenario.name,
    parameters: scenario.parameters,
    baseline,
    projected: { ...baseline },
    changes: {},
    confidence: 0.7,
    timestamp: new Date().toISOString()
  };

  // Simulate different scenarios
  if (scenario.type === 'price_change') {
    const priceDelta = scenario.parameters.priceChange || 0;
    result.projected.ltv = Math.max(0, baseline.ltv * (1 - priceDelta * 0.5));
    result.projected.churnRisk = Math.min(100, baseline.churnRisk + priceDelta * 30);
    result.changes = {
      ltv: result.projected.ltv - baseline.ltv,
      churnRisk: result.projected.churnRisk - baseline.churnRisk
    };
  } else if (scenario.type === 'engagement_campaign') {
    result.projected.engagement = Math.min(100, baseline.engagement + 20);
    result.projected.churnRisk = Math.max(0, baseline.churnRisk - 15);
    result.projected.ltv = baseline.ltv * 1.2;
    result.changes = {
      engagement: result.projected.engagement - baseline.engagement,
      churnRisk: result.projected.churnRisk - baseline.churnRisk,
      ltv: result.projected.ltv - baseline.ltv
    };
  } else if (scenario.type === 'tier_upgrade') {
    result.projected.ltv = baseline.ltv * 1.5;
    result.projected.satisfaction = Math.min(100, baseline.satisfaction + 10);
    result.changes = {
      ltv: result.projected.ltv - baseline.ltv,
      satisfaction: result.projected.satisfaction - baseline.satisfaction
    };
  }

  twinSimulations.set(simId, result);
  return result;
}

/**
 * Get twin
 */
export function getTwin(userId) {
  return identityTwins.get(userId) || getOrCreateTwin(userId);
}

/**
 * Update twin manually
 */
export function updateTwin(userId, data) {
  const twin = getOrCreateTwin(userId);

  const allowedFields = ['profile', 'behaviors', 'preferences', 'state'];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      twin[field] = { ...twin[field], ...data[field] };
    }
  }

  twin.version++;
  twin.lastUpdated = new Date().toISOString();
  identityTwins.set(userId, twin);

  return twin;
}

/**
 * Get twin stats
 */
export function getTwinStats() {
  const twins = Array.from(identityTwins.values());

  const avgHealth = twins.length > 0
    ? twins.reduce((sum, t) => sum + t.state.health, 0) / twins.length
    : 0;

  const avgLTV = twins.length > 0
    ? twins.reduce((sum, t) => sum + t.predictions.lifetimeValue, 0) / twins.length
    : 0;

  const avgChurnRisk = twins.length > 0
    ? twins.reduce((sum, t) => sum + t.predictions.churnRisk, 0) / twins.length
    : 0;

  return {
    totalTwins: twins.length,
    averageHealth: Math.round(avgHealth),
    averageLTV: Math.round(avgLTV),
    averageChurnRisk: Math.round(avgChurnRisk),
    totalSimulations: twinSimulations.size
  };
}
