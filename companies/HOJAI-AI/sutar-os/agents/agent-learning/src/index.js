import cors from 'cors';
import helmet from 'helmet';
/**
 * Agent Learning Service
 *
 * Machine learning service that improves agent behavior over time.
 * Learns from:
 * - Past negotiations
 * - User preferences
 * - Successful transactions
 * - Failed negotiations
 * - Market trends
 *
 * Provides:
 * - Preference learning
 * - Negotiation strategy optimization
 * - Price prediction
 * - Behavior personalization
 * - Recommendation improvements
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-learning' });

const PORT = process.env.PORT || 4846;

// In-memory stores
const learningModels = new PersistentMap('learning-models', { serviceName: 'agent-learning' });
const userBehavior = new PersistentMap('user-behavior', { serviceName: 'agent-learning' });
const negotiationHistory = new PersistentMap('negotiation-history', { serviceName: 'agent-learning' });
const preferenceProfiles = new PersistentMap('preference-profiles', { serviceName: 'agent-learning' });
const learnedStrategies = new PersistentMap('learned-strategies', { serviceName: 'agent-learning' });
const trainingData = new PersistentMap('training-data', { serviceName: 'agent-learning' });

// Learning types
const LEARNING_TYPES = {
  PREFERENCE: 'preference',
  NEGOTIATION: 'negotiation',
  PRICING: 'pricing',
  RECOMMENDATION: 'recommendation',
  TIMING: 'timing',
  BEHAVIOR: 'behavior'
};

/**
 * Record user behavior
 */
function recordBehavior(userId, behavior) {
  const behaviors = userBehavior.get(userId) || [];
  const record = {
    id: uuidv4(),
    userId,
    ...behavior,
    timestamp: new Date().toISOString()
  };

  behaviors.push(record);

  // Keep last 1000 behaviors
  if (behaviors.length > 1000) {
    behaviors.shift();
  }

  userBehavior.set(userId, behaviors);

  // Update preference profile
  updatePreferenceProfile(userId, record);

  return record;
}

/**
 * Update preference profile based on behavior
 */
function updatePreferenceProfile(userId, behavior) {
  let profile = preferenceProfiles.get(userId);

  if (!profile) {
    profile = {
      userId,
      preferences: {
        priceRange: { min: 0, max: 1000, avg: 100 },
        categories: {},
        brands: {},
        timing: {
          preferredShoppingHours: [],
          preferredDaysOfWeek: []
        },
        negotiation: {
          willingness: 0.5,  // 0-1 scale
          aggressiveness: 0.5,
          successRate: 0,
          avgRounds: 0
        },
        quality: {
          preference: 0.5,  // Quality vs price
          avgRating: 4.0
        },
        speed: {
          preference: 0.5,  // Speed vs price
          avgDeliveryDays: 3
        }
      },
      patterns: {
        frequentlyPurchased: [],
        abandonedItems: [],
        wishlistedItems: [],
        viewedCategories: {},
        searchHistory: []
      },
      confidence: 0,  // 0-1 scale, increases with more data
      lastUpdated: new Date().toISOString(),
      dataPoints: 0
    };
  }

  const pref = profile.preferences;
  const data = behavior.data || {};

  // Update price range
  if (data.price) {
    const { min, max, avg } = pref.priceRange;
    const newAvg = ((avg * profile.dataPoints) + data.price) / (profile.dataPoints + 1);
    pref.priceRange = {
      min: Math.min(min, data.price),
      max: Math.max(max, data.price),
      avg: newAvg
    };
  }

  // Update category preferences
  if (data.category) {
    pref.categories[data.category] = (pref.categories[data.category] || 0) + 1;
  }

  // Update brand preferences
  if (data.brand) {
    pref.brands[data.brand] = (pref.brands[data.brand] || 0) + 1;
  }

  // Update timing preferences
  if (behavior.type === 'purchase' || behavior.type === 'view') {
    const date = new Date();
    const hour = date.getHours();
    const day = date.getDay();

    pref.timing.preferredShoppingHours.push(hour);
    pref.timing.preferredDaysOfWeek.push(day);

    // Keep last 100
    if (pref.timing.preferredShoppingHours.length > 100) {
      pref.timing.preferredShoppingHours.shift();
    }
    if (pref.timing.preferredDaysOfWeek.length > 100) {
      pref.timing.preferredDaysOfWeek.shift();
    }
  }

  // Update negotiation profile
  if (behavior.type === 'negotiation') {
    if (data.rounds) {
      const oldAvg = pref.negotiation.avgRounds;
      const oldCount = profile.dataPoints;
      pref.negotiation.avgRounds = (oldAvg * oldCount + data.rounds) / (oldCount + 1);
    }
    if (data.success !== undefined) {
      const oldRate = pref.negotiation.successRate;
      const oldCount = profile.dataPoints;
      pref.negotiation.successRate = (oldRate * oldCount + (data.success ? 1 : 0)) / (oldCount + 1);
    }
  }

  // Update patterns
  if (behavior.type === 'purchase' && data.itemId) {
    profile.patterns.frequentlyPurchased.unshift(data.itemId);
    profile.patterns.frequentlyPurchased = profile.patterns.frequentlyPurchased.slice(0, 50);
  }

  if (behavior.type === 'view' && data.category) {
    profile.patterns.viewedCategories[data.category] =
      (profile.patterns.viewedCategories[data.category] || 0) + 1;
  }

  if (behavior.type === 'search' && data.query) {
    profile.patterns.searchHistory.unshift(data.query);
    profile.patterns.searchHistory = profile.patterns.searchHistory.slice(0, 100);
  }

  // Increase confidence with more data
  profile.dataPoints++;
  profile.confidence = Math.min(1, profile.dataPoints / 50);
  profile.lastUpdated = new Date().toISOString();

  preferenceProfiles.set(userId, profile);
  return profile;
}

/**
 * Record negotiation outcome
 */
function recordNegotiation(agentId, negotiation) {
  const negotiations = negotiationHistory.get(agentId) || [];
  const record = {
    id: negotiation.id || uuidv4(),
    agentId,
    counterparty: negotiation.counterparty,
    product: negotiation.product,
    category: negotiation.category,
    initialOffer: negotiation.initialOffer,
    finalPrice: negotiation.finalPrice,
    rounds: negotiation.rounds,
    duration: negotiation.duration,
    outcome: negotiation.outcome,  // success, failed, partial
    strategy: negotiation.strategy,
    timestamp: new Date().toISOString()
  };

  negotiations.push(record);
  negotiationHistory.set(agentId, negotiations);

  // Learn strategy
  learnStrategy(agentId, record);

  return record;
}

/**
 * Learn from negotiation outcomes
 */
function learnStrategy(agentId, record) {
  let strategy = learnedStrategies.get(agentId);

  if (!strategy) {
    strategy = {
      agentId,
      strategies: {},
      overall: {
        successRate: 0,
        avgRounds: 0,
        avgDiscount: 0,
        bestCategory: null,
        bestTimeOfDay: null
      },
      version: 1,
      lastUpdated: new Date().toISOString()
    };
  }

  const category = record.category || 'general';
  const strategyKey = record.strategy || 'default';

  if (!strategy.strategies[category]) {
    strategy.strategies[category] = {
      strategy: strategyKey,
      attempts: 0,
      successes: 0,
      avgRounds: 0,
      avgFinalPrice: 0,
      successRate: 0
    };
  }

  const cat = strategy.strategies[category];
  cat.attempts++;

  if (record.outcome === 'success') {
    cat.successes++;
  }

  cat.avgRounds = ((cat.avgRounds * (cat.attempts - 1)) + record.rounds) / cat.attempts;
  cat.avgFinalPrice = ((cat.avgFinalPrice * (cat.attempts - 1)) + record.finalPrice) / cat.attempts;
  cat.successRate = cat.successes / cat.attempts;

  // Determine best strategy for category
  if (cat.successRate > 0.5) {
    cat.strategy = strategyKey;
  }

  // Update overall
  const allCategories = Object.values(strategy.strategies);
  strategy.overall.successRate = allCategories.reduce((sum, c) => sum + c.successRate, 0) / allCategories.length;
  strategy.overall.avgRounds = allCategories.reduce((sum, c) => sum + c.avgRounds, 0) / allCategories.length;

  strategy.version++;
  strategy.lastUpdated = new Date().toISOString();

  learnedStrategies.set(agentId, strategy);
  return strategy;
}

/**
 * Get price prediction
 */
function predictPrice(productId, category, basePrice) {
  // Simple prediction based on historical data
  const allNegotiations = Array.from(negotiationHistory.values()).flat();

  const categoryNegotiations = allNegotiations.filter(n => n.category === category);

  if (categoryNegotiations.length === 0) {
    return {
      predictedPrice: basePrice,
      confidence: 0,
      range: { min: basePrice * 0.85, max: basePrice * 1.0 }
    };
  }

  const prices = categoryNegotiations.map(n => n.finalPrice);
  const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    predictedPrice: avg.toFixed(2),
    confidence: Math.min(1, categoryNegotiations.length / 100),
    range: { min: min.toFixed(2), max: max.toFixed(2) },
    sampleSize: categoryNegotiations.length
  };
}

/**
 * Get personalized recommendations
 */
function getRecommendations(userId, context = {}) {
  const profile = preferenceProfiles.get(userId);

  if (!profile) {
    return { recommendations: [], confidence: 0 };
  }

  const recommendations = [];

  // Based on category preferences
  const topCategories = Object.entries(profile.preferences.categories)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  topCategories.forEach(([category, count]) => {
    recommendations.push({
      type: 'category',
      category,
      reason: `You frequently shop in ${category}`,
      confidence: profile.confidence
    });
  });

  // Based on price range
  recommendations.push({
    type: 'price',
    priceRange: profile.preferences.priceRange,
    reason: `Based on your average spending of $${profile.preferences.priceRange.avg.toFixed(2)}`
  });

  // Based on frequently purchased
  if (profile.patterns.frequentlyPurchased.length > 0) {
    recommendations.push({
      type: 'repeat',
      items: profile.patterns.frequentlyPurchased.slice(0, 5),
      reason: 'You bought these before'
    });
  }

  // Based on search history
  if (profile.patterns.searchHistory.length > 0) {
    const recentSearches = profile.patterns.searchHistory.slice(0, 5);
    recommendations.push({
      type: 'search_based',
      items: recentSearches,
      reason: 'Based on your recent searches'
    });
  }

  return {
    recommendations,
    confidence: profile.confidence,
    profile: {
      priceRange: profile.preferences.priceRange,
      topCategories: topCategories.map(c => c[0])
    }
  };
}

/**
 * Get optimal negotiation strategy
 */
function getOptimalStrategy(agentId, category, context = {}) {
  const strategies = learnedStrategies.get(agentId);

  if (!strategies || !strategies.strategies[category]) {
    return {
      strategy: 'moderate',
      reasoning: 'No prior data - using default strategy',
      confidence: 0
    };
  }

  const categoryStrategy = strategies.strategies[category];

  return {
    strategy: categoryStrategy.strategy,
    successRate: categoryStrategy.successRate,
    avgRounds: categoryStrategy.avgRounds,
    expectedDiscount: categoryStrategy.avgFinalPrice,
    confidence: Math.min(1, categoryStrategy.attempts / 20),
    sampleSize: categoryStrategy.attempts
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Learning Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      userProfiles: preferenceProfiles.size,
      strategiesLearned: learnedStrategies.size,
      negotiationsRecorded: Array.from(negotiationHistory.values()).reduce((sum, n) => sum + n.length, 0)
    }
  });
});

/**
 * Record behavior
 * POST /api/behavior
 */
app.post('/api/behavior',requireAuth,  (req, res) => {
  try {
    const { userId, ...behavior } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const record = recordBehavior(userId, behavior);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get user profile
 * GET /api/profile/:userId
 */
app.get('/api/profile/:userId', (req, res) => {
  const profile = preferenceProfiles.get(req.params.userId);
  if (!profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }
  res.json(profile);
});

/**
 * Update user profile
 * PUT /api/profile/:userId
 */
app.put('/api/profile/:userId',requireAuth,  (req, res) => {
  try {
    let profile = preferenceProfiles.get(req.params.userId);
    if (!profile) {
      profile = {
        userId: req.params.userId,
        preferences: {},
        patterns: {},
        confidence: 0,
        dataPoints: 0
      };
    }

    profile = { ...profile, ...req.body, userId: req.params.userId };
    preferenceProfiles.set(req.params.userId, profile);

    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Record negotiation
 * POST /api/negotiations
 */
app.post('/api/negotiations',requireAuth,  (req, res) => {
  try {
    const { agentId, ...negotiation } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const record = recordNegotiation(agentId, negotiation);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get agent strategy
 * GET /api/strategy/:agentId
 */
app.get('/api/strategy/:agentId', (req, res) => {
  const { category } = req.query;

  if (category) {
    const strategy = getOptimalStrategy(req.params.agentId, category);
    return res.json(strategy);
  }

  const allStrategies = learnedStrategies.get(req.params.agentId);
  if (!allStrategies) {
    return res.json({ strategy: 'moderate', strategies: {}, version: 0 });
  }

  res.json(allStrategies);
});

/**
 * Get price prediction
 * POST /api/predict-price
 */
app.post('/api/predict-price',requireAuth,  (req, res) => {
  const { productId, category, basePrice } = req.body;
  const prediction = predictPrice(productId, category, basePrice);
  res.json(prediction);
});

/**
 * Get recommendations
 * GET /api/recommendations/:userId
 */
app.get('/api/recommendations/:userId', (req, res) => {
  const recommendations = getRecommendations(req.params.userId, req.query);
  res.json(recommendations);
});

/**
 * Get behavior history
 * GET /api/behavior/:userId
 */
app.get('/api/behavior/:userId', (req, res) => {
  const behaviors = userBehavior.get(req.params.userId) || [];
  const { type, limit = 50 } = req.query;

  let filtered = behaviors;
  if (type) {
    filtered = filtered.filter(b => b.type === type);
  }

  res.json({
    total: filtered.length,
    behaviors: filtered.slice(-parseInt(limit)).reverse()
  });
});

/**
 * Get negotiation history
 * GET /api/negotiations/:agentId
 */
app.get('/api/negotiations/:agentId', (req, res) => {
  const negotiations = negotiationHistory.get(req.params.agentId) || [];
  const { limit = 50, category } = req.query;

  let filtered = negotiations;
  if (category) {
    filtered = filtered.filter(n => n.category === category);
  }

  res.json({
    total: filtered.length,
    negotiations: filtered.slice(-parseInt(limit)).reverse()
  });
});

/**
 * Get learning stats
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const profiles = Array.from(preferenceProfiles.values());

  res.json({
    totalProfiles: profiles.length,
    totalBehaviors: Array.from(userBehavior.values()).reduce((sum, b) => sum + b.length, 0),
    totalNegotiations: Array.from(negotiationHistory.values()).reduce((sum, n) => sum + n.length, 0),
    totalStrategies: learnedStrategies.size,
    avgConfidence: profiles.length > 0
      ? (profiles.reduce((sum, p) => sum + p.confidence, 0) / profiles.length).toFixed(2)
      : 0,
    profilesByConfidence: {
      high: profiles.filter(p => p.confidence > 0.7).length,
      medium: profiles.filter(p => p.confidence > 0.3 && p.confidence <= 0.7).length,
      low: profiles.filter(p => p.confidence <= 0.3).length
    }
  });
});

/**
 * Train model endpoint
 * POST /api/train
 */
app.post('/api/train',requireAuth,  (req, res) => {
  const { modelType, agentId, data } = req.body;

  const model = {
    id: uuidv4(),
    type: modelType,
    agentId,
    dataPoints: data?.length || 0,
    startedAt: new Date().toISOString(),
    status: 'training'
  };

  // Simulate training
  setTimeout(() => {
    model.status = 'completed';
    model.completedAt = new Date().toISOString();
    model.accuracy = 0.85 + Math.random() * 0.1;
    learningModels.set(model.id, model);
  }, 1000);

  learningModels.set(model.id, model);
  res.status(201).json(model);
});

/**
 * Get model status
 * GET /api/models/:id
 */
app.get('/api/models/:id', (req, res) => {
  const model = learningModels.get(req.params.id);
  if (!model) {
    return res.status(404).json({ error: 'Model not found' });
  }
  res.json(model);
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT LEARNING SERVICE                             ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Learning Capabilities:                                       ║
║    • User preference modeling                                ║
║    • Negotiation strategy optimization                      ║
║    • Price prediction                                         ║
║    • Personalized recommendations                            ║
║    • Behavior pattern recognition                            ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/behavior              Record behavior          ║
║    GET    /api/profile/:userId       Get user profile        ║
║    POST   /api/negotiations          Record negotiation      ║
║    GET    /api/strategy/:agentId     Get optimal strategy    ║
║    POST   /api/predict-price         Price prediction        ║
║    GET    /api/recommendations/:id   Get recommendations     ║
║    POST   /api/train                 Train model             ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
module.exports.LEARNING_TYPES = LEARNING_TYPES;
module.exports.recordBehavior = recordBehavior;
module.exports.updatePreferenceProfile = updatePreferenceProfile;
module.exports.recordNegotiation = recordNegotiation;
module.exports.learnStrategy = learnStrategy;
module.exports.predictPrice = predictPrice;
module.exports.getRecommendations = getRecommendations;
module.exports.getOptimalStrategy = getOptimalStrategy;
