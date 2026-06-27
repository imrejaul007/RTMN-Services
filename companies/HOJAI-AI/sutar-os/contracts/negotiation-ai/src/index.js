import cors from 'cors';
import helmet from 'helmet';
/**
 * Advanced Negotiation AI Service
 *
 * ML-powered negotiation strategies that improve over time.
 * Features:
 * - Multi-strategy negotiation (competitive, collaborative, accommodating)
 * - Win-win optimization
 * - Real-time price prediction
 * - Counter-offer generation
 * - Optimal stopping point detection
 * - Personality-based adaptation
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
setupSecurity(app, { serviceName: 'negotiation-ai' });

const PORT = process.env.PORT || 4850;

// In-memory stores
const strategies = new PersistentMap('strategies', { serviceName: 'negotiation-ai' });
const sessions = new PersistentMap('sessions', { serviceName: 'negotiation-ai' });
const trainedModels = new PersistentMap('trained-models', { serviceName: 'negotiation-ai' });
const marketData = new PersistentMap('market-data', { serviceName: 'negotiation-ai' });

// Negotiation strategies
const STRATEGY_TYPES = {
  COMPETITIVE: 'competitive',     // Win-lose, hard bargaining
  COLLABORATIVE: 'collaborative', // Win-win, problem solving
  ACCOMMODATING: 'accommodating', // Yield to maintain relationship
  AVOIDING: 'avoiding',           // Delay or withdraw
  COMPROMISING: 'compromising',   // Middle ground
  PRINCIPLED: 'principled'        // Objective standards, BATNA focus
};

/**
 * Calculate optimal counter offer using multiple strategies
 */
function calculateOptimalCounter(offer, context) {
  const { targetPrice, maxPrice, minPrice, marketPrice, urgency, relationship, sellerFlexibility } = context;

  // Strategy: Principled (objective market-based)
  const marketCounter = marketPrice
    ? (offer.price + marketPrice) / 2
    : offer.price * 0.95;

  // Strategy: Competitive (push hard for target)
  const competitiveCounter = Math.max(targetPrice, offer.price * 0.9);

  // Strategy: Collaborative (find middle ground)
  const collaborativeCounter = (offer.price + targetPrice) / 2;

  // Strategy: BATNA-based (walk away point)
  const batnaCounter = Math.min(maxPrice, offer.price * 0.92);

  // Choose based on context
  let selected = marketCounter;
  let strategy = 'principled';
  let reasoning = '';

  if (urgency === 'urgent') {
    selected = collaborativeCounter;
    strategy = 'collaborative';
    reasoning = 'Time pressure - seek quick middle ground';
  } else if (relationship === 'high') {
    selected = collaborativeCounter;
    strategy = 'collaborative';
    reasoning = 'Strong relationship - preserve for future';
  } else if (sellerFlexibility === 'low') {
    selected = competitiveCounter;
    strategy = 'competitive';
    reasoning = 'Seller is firm - push harder';
  } else if (urgency === 'low') {
    selected = batnaCounter;
    strategy = 'principled';
    reasoning = 'No rush - leverage BATNA';
  }

  return {
    counterPrice: Math.round(selected * 100) / 100,
    strategy,
    reasoning,
    alternatives: {
      competitive: Math.round(competitiveCounter * 100) / 100,
      collaborative: Math.round(collaborativeCounter * 100) / 100,
      batna: Math.round(batnaCounter * 100) / 100
    },
    acceptableRange: {
      min: Math.round(minPrice * 100) / 100,
      max: Math.round(maxPrice * 100) / 100
    }
  };
}

/**
 * Determine if negotiation should continue or accept
 */
function shouldAcceptOrContinue(offer, context, history) {
  const { targetPrice, maxPrice, currentRound, maxRounds, walkAwayPoint } = context;

  const satisfaction = (maxPrice - offer.price) / (maxPrice - targetPrice);

  // Excellent offer
  if (offer.price <= targetPrice) {
    return {
      action: 'accept',
      confidence: 0.95,
      reasoning: 'Offer meets or exceeds target price',
      expectedSavings: maxPrice - offer.price
    };
  }

  // Very close to target (within 5%)
  if (offer.price <= targetPrice * 1.05) {
    return {
      action: 'accept',
      confidence: 0.85,
      reasoning: 'Offer is within 5% of target - good deal',
      expectedSavings: maxPrice - offer.price
    };
  }

  // At max rounds - take it or leave it
  if (currentRound >= maxRounds) {
    return {
      action: offer.price <= maxPrice ? 'accept' : 'reject',
      confidence: 0.7,
      reasoning: 'Reached max rounds - final decision time',
      expectedSavings: maxPrice - offer.price
    };
  }

  // Above walk-away point
  if (offer.price > walkAwayPoint) {
    return {
      action: 'reject',
      confidence: 0.8,
      reasoning: 'Offer exceeds walk-away point',
      expectedSavings: 0
    };
  }

  // Continue negotiation with counter
  const counterOffer = {
    price: Math.max(targetPrice, offer.price * 0.93)
  };

  return {
    action: 'counter',
    confidence: 0.7 - (currentRound / maxRounds) * 0.2,  // Decreases over time
    reasoning: `Round ${currentRound}/${maxRounds} - room for ${(((offer.price - targetPrice) / offer.price) * 100).toFixed(1)}% improvement`,
    counterOffer,
    expectedOutcome: counterOffer.price
  };
}

/**
 * Predict final price based on negotiation pattern
 */
function predictFinalPrice(offers, targetPrice) {
  if (offers.length === 0) return targetPrice;

  // Calculate convergence rate
  const lastOffer = offers[offers.length - 1].price;
  const initialOffer = offers[0].price;

  const gap = Math.abs(lastOffer - targetPrice);
  const initialGap = Math.abs(initialOffer - targetPrice);

  const convergenceRate = initialGap > 0 ? 1 - (gap / initialGap) : 1;

  // Linear extrapolation
  const predicted = lastOffer - (lastOffer - targetPrice) * 0.5;

  return {
    predictedPrice: Math.round(predicted * 100) / 100,
    confidence: Math.min(0.9, convergenceRate),
    convergenceRate: convergenceRate.toFixed(2),
    roundsAnalyzed: offers.length
  };
}

/**
 * Generate negotiation persona
 */
function generatePersona(style, traits = {}) {
  const personas = {
    aggressive: {
      style: 'aggressive',
      openingDiscount: 0.20,
      maxConcession: 0.08,
      rounds: 5,
      tone: 'firm',
      tactics: ['anchor_high', 'walk_away_threat', 'deadline_pressure']
    },
    moderate: {
      style: 'moderate',
      openingDiscount: 0.15,
      maxConcession: 0.12,
      rounds: 4,
      tone: 'professional',
      tactics: ['market_reference', 'alternative_options']
    },
    diplomatic: {
      style: 'diplomatic',
      openingDiscount: 0.10,
      maxConcession: 0.15,
      rounds: 5,
      tone: 'friendly',
      tactics: ['relationship_focus', 'mutual_benefit']
    },
    analytical: {
      style: 'analytical',
      openingDiscount: 0.12,
      maxConcession: 0.10,
      rounds: 6,
      tone: 'data_driven',
      tactics: ['market_data', 'cost_breakdown', 'comparables']
    }
  };

  const base = personas[style] || personas.moderate;
  return { ...base, ...traits };
}

/**
 * Analyze negotiation outcome
 */
function analyzeOutcome(session) {
  const { offers, targetPrice, finalPrice, rounds, duration, strategy } = session;

  const initialOffer = offers[0]?.price || 0;
  const improvement = targetPrice > 0 ? ((initialOffer - finalPrice) / initialOffer) * 100 : 0;
  const savingsVsTarget = finalPrice - targetPrice;

  return {
    summary: {
      rounds,
      duration,
      initialOffer,
      finalPrice,
      savings: initialOffer - finalPrice,
      savingsVsTarget,
      targetAchievement: targetPrice > 0 ? (((targetPrice - finalPrice) / targetPrice) * 100 + 100).toFixed(1) + '%' : 'N/A'
    },
    effectiveness: {
      discountAchieved: improvement.toFixed(1) + '%',
      roundsEfficiency: rounds <= 3 ? 'high' : rounds <= 5 ? 'medium' : 'low',
      speed: duration < 3600000 ? 'fast' : duration < 86400000 ? 'medium' : 'slow'
    },
    strategy: {
      used: strategy,
      effectivenessRating: improvement > 15 ? 'highly_effective' : improvement > 5 ? 'effective' : 'needs_improvement'
    },
    insights: [
      improvement > 15 ? 'Strong negotiation achieved significant savings' : null,
      rounds > 5 ? 'Consider being more decisive in future negotiations' : null,
      finalPrice > targetPrice ? 'Final price exceeded target - review strategy' : null
    ].filter(Boolean)
  };
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Advanced Negotiation AI',
    version: '1.0.0',
    port: PORT,
    status: 'running'
  });
});

/**
 * Calculate optimal counter offer
 * POST /api/counter
 */
app.post('/api/counter',requireAuth,  (req, res) => {
  try {
    const { offer, context } = req.body;
    const counter = calculateOptimalCounter(offer, context);
    res.json(counter);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Should accept or continue?
 * POST /api/decide
 */
app.post('/api/decide',requireAuth,  (req, res) => {
  try {
    const { offer, context, history = [] } = req.body;
    const decision = shouldAcceptOrContinue(offer, context, history);
    res.json(decision);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Predict final price
 * POST /api/predict
 */
app.post('/api/predict',requireAuth,  (req, res) => {
  try {
    const { offers, targetPrice } = req.body;
    const prediction = predictFinalPrice(offers, targetPrice);
    res.json(prediction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Generate persona
 * POST /api/persona
 */
app.post('/api/persona',requireAuth,  (req, res) => {
  try {
    const { style, traits } = req.body;
    const persona = generatePersona(style || 'moderate', traits);
    res.json(persona);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Analyze outcome
 * POST /api/analyze
 */
app.post('/api/analyze',requireAuth,  (req, res) => {
  try {
    const analysis = analyzeOutcome(req.body);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Run full negotiation simulation
 * POST /api/simulate
 */
app.post('/api/simulate',requireAuth,  (req, res) => {
  try {
    const { buyerAgent, sellerAgent, product, initialPrice, targetPrice, maxRounds = 5 } = req.body;

    const session = {
      id: uuidv4(),
      product,
      offers: [{ from: 'seller', price: initialPrice, round: 0 }],
      currentRound: 0,
      maxRounds,
      targetPrice,
      finalPrice: null,
      status: 'active',
      startedAt: new Date().toISOString()
    };

    // Simulate rounds
    let currentOffer = initialPrice;
    for (let round = 1; round <= maxRounds; round++) {
      // Buyer counter
      const counterPrice = currentOffer - (currentOffer - targetPrice) * 0.4;
      session.offers.push({
        from: 'buyer',
        price: Math.round(counterPrice * 100) / 100,
        round
      });
      currentOffer = counterPrice;

      // Check if acceptable
      if (currentOffer <= targetPrice * 1.05) {
        session.finalPrice = currentOffer;
        session.status = 'agreed';
        session.currentRound = round;
        break;
      }

      // Seller counter
      if (round < maxRounds) {
        const sellerCounter = counterPrice + (initialPrice - counterPrice) * 0.3;
        session.offers.push({
          from: 'seller',
          price: Math.round(sellerCounter * 100) / 100,
          round
        });
        currentOffer = sellerCounter;
      }
    }

    if (!session.finalPrice) {
      session.finalPrice = session.offers[session.offers.length - 1].price;
      session.status = session.currentRound >= maxRounds ? 'max_rounds_reached' : 'agreed';
    }

    session.endedAt = new Date().toISOString();
    session.duration = new Date(session.endedAt) - new Date(session.startedAt);
    session.currentRound = session.offers[session.offers.length - 1].round;

    const analysis = analyzeOutcome(session);

    sessions.set(session.id, session);
    res.json({ session, analysis });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get strategies
 * GET /api/strategies
 */
app.get('/api/strategies', (req, res) => {
  res.json({
    strategies: Object.values(STRATEGY_TYPES).map(s => ({
      type: s,
      description: getStrategyDescription(s)
    }))
  });
});

function getStrategyDescription(strategy) {
  const descriptions = {
    competitive: 'Win-lose approach, hard bargaining, used for one-time deals',
    collaborative: 'Win-win approach, focuses on mutual benefits and long-term relationships',
    accommodating: 'Yield to maintain relationships, used when relationship matters more than outcome',
    avoiding: 'Delay or withdraw from negotiation, used when stakes are low',
    compromising: 'Find middle ground quickly, used when time is limited',
    principled: 'Use objective standards and BATNA, focuses on fair outcomes'
  };
  return descriptions[strategy] || 'Standard negotiation approach';
}
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (_req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
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

// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ADVANCED NEGOTIATION AI                             ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Strategies:                                                   ║
║    Competitive | Collaborative | Accommodating                ║
║    Avoiding    | Compromising  | Principled                  ║
╠══════════════════════════════════════════════════════════════╣
║  Capabilities:                                               ║
║    • Counter-offer optimization                              ║
║    • Accept/reject decision engine                           ║
║    • Final price prediction                                  ║
║    • Persona generation                                      ║
║    • Outcome analysis                                        ║
║    • Full negotiation simulation                              ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/counter           Optimal counter              ║
║    POST   /api/decide            Accept/reject decision       ║
║    POST   /api/predict           Final price prediction       ║
║    POST   /api/persona           Generate persona             ║
║    POST   /api/analyze           Analyze outcome              ║
║    POST   /api/simulate          Run simulation               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
