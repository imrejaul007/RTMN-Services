/**
 * HOJAI COD Intelligence Service
 *
 * Determines whether Cash on Delivery should be allowed for customers.
 * The killer feature for D2C brands in India.
 *
 * Port: 4898
 *
 * @author HOJAI AI
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4898;
const SERVICE_NAME = 'cod-intelligence';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory store for customer COD history
const codHistory = new Map();

// Weights for COD scoring
const WEIGHTS = {
  codSuccessRate: 0.35,
  addressStability: 0.20,
  deviceConsistency: 0.10,
  orderValueRisk: 0.15,
  accountAgeFactor: 0.10,
  velocityRisk: 0.10
};

/**
 * Calculate COD eligibility score
 */
function calculateCodScore(data) {
  const {
    customerId,
    orderHistory,
    addressHistory,
    deviceHistory,
    purchaseAmount,
    category,
    accountAge
  } = data;

  let score = 0.5; // Start neutral
  const factors = [];
  const reasons = [];

  // COD Success Rate (35% weight)
  if (orderHistory) {
    const { total, completed } = orderHistory;
    const codSuccessRate = total > 0 ? completed / total : 0.5;

    const contribution = (codSuccessRate - 0.5) * WEIGHTS.codSuccessRate * 2;
    score += contribution;

    factors.push({
      name: 'cod_success_rate',
      impact: WEIGHTS.codSuccessRate,
      value: `${Math.round(codSuccessRate * 100)}%`,
      description: 'Historical COD completion rate'
    });

    if (codSuccessRate >= 0.95) {
      reasons.push('Excellent COD completion history (95%+)');
    } else if (codSuccessRate >= 0.85) {
      reasons.push('Good COD completion history');
    } else if (codSuccessRate < 0.7) {
      reasons.push('Below average COD completion rate');
    } else if (codSuccessRate < 0.5) {
      reasons.push('Poor COD completion history - high risk');
    }
  }

  // Address Stability (20% weight)
  if (addressHistory) {
    const { changes90d, verified } = addressHistory;
    // More address changes = less stable = lower score
    const stability = Math.max(0, 1 - (changes90d / 5));
    const verifiedBonus = verified ? 0.1 : 0;

    const contribution = (stability + verifiedBonus - 0.5) * WEIGHTS.addressStability * 2;
    score += contribution;

    factors.push({
      name: 'address_stability',
      impact: WEIGHTS.addressStability,
      value: changes90d === 0 ? 'stable' : `${changes90d} changes in 90 days`,
      description: 'Address change frequency'
    });

    if (changes90d === 0 && verified) {
      reasons.push('Verified stable delivery address');
    } else if (changes90d > 3) {
      reasons.push('Multiple address changes in recent period');
    }
  }

  // Device Consistency (10% weight)
  if (deviceHistory) {
    const { changes30d } = deviceHistory;
    const consistency = Math.max(0, 1 - (changes30d / 3));

    const contribution = (consistency - 0.5) * WEIGHTS.deviceConsistency * 2;
    score += contribution;

    factors.push({
      name: 'device_consistency',
      impact: WEIGHTS.deviceConsistency,
      value: changes30d === 0 ? 'consistent' : `${changes30d} device changes`,
      description: 'Device change frequency'
    });
  }

  // Order Value Risk (15% weight)
  if (purchaseAmount) {
    // Higher value orders have more risk
    let valueRisk = 0;
    if (purchaseAmount > 15000) {
      valueRisk = 0.3;
      reasons.push('High-value order (₹15,000+) - elevated risk');
    } else if (purchaseAmount > 10000) {
      valueRisk = 0.15;
      reasons.push('Moderate-high value order');
    } else if (purchaseAmount > 5000) {
      valueRisk = 0.05;
    }

    score -= valueRisk * WEIGHTS.orderValueRisk * 2;

    factors.push({
      name: 'order_value_risk',
      impact: WEIGHTS.orderValueRisk,
      value: `₹${purchaseAmount.toLocaleString('en-IN')}`,
      description: 'Purchase amount risk factor'
    });
  }

  // Category Risk
  if (category) {
    const highRiskCategories = ['electronics', 'jewelry', 'gadgets'];
    const mediumRiskCategories = ['fashion', 'footwear'];

    if (highRiskCategories.includes(category.toLowerCase())) {
      score -= 0.1;
      reasons.push('High-risk category - elevated verification recommended');
    } else if (mediumRiskCategories.includes(category.toLowerCase())) {
      score -= 0.05;
    }

    factors.push({
      name: 'category_risk',
      impact: 0.05,
      value: category,
      description: 'Product category risk'
    });
  }

  // Account Age Factor (10% weight)
  if (accountAge) {
    const ageFactor = Math.min(accountAge / 180, 1); // Max out at 6 months
    const contribution = (ageFactor - 0.5) * WEIGHTS.accountAgeFactor * 2;
    score += contribution;

    factors.push({
      name: 'account_age',
      impact: WEIGHTS.accountAgeFactor,
      value: `${accountAge} days`,
      description: 'Account tenure'
    });

    if (accountAge >= 180) {
      reasons.push('Established customer account (6+ months)');
    } else if (accountAge < 30) {
      reasons.push('New customer - limited history');
    }
  }

  // Velocity Risk (10% weight) - multiple orders in short period
  if (orderHistory?.recentOrders) {
    const recentOrders = orderHistory.recentOrders; // orders in last 7 days
    if (recentOrders > 3) {
      score -= 0.15;
      reasons.push('High order frequency - verification recommended');
    }
  }

  // Clamp score to 0-1
  score = Math.max(0, Math.min(1, score));

  // Determine recommendation
  let recommendation;
  let allowed;

  if (score >= 0.75) {
    recommendation = 'allow';
    allowed = true;
    if (!reasons.length) reasons.push('Strong COD eligibility indicators');
  } else if (score >= 0.5) {
    recommendation = 'review';
    allowed = true;
  } else if (score >= 0.3) {
    recommendation = 'review';
    allowed = false;
  } else {
    recommendation = 'block';
    allowed = false;
    if (!reasons.length) reasons.push('High risk - COD not recommended');
  }

  const confidence = Math.round(score * 100);

  // Store history for future reference
  if (customerId) {
    codHistory.set(customerId, {
      score,
      recommendation,
      timestamp: new Date().toISOString()
    });
  }

  return {
    allowed,
    confidence,
    recommendation,
    factors,
    reasons
  };
}

/**
 * Calculate return risk for COD orders
 */
function calculateReturnRisk(data) {
  const { orderHistory, returnVelocity, itemValues } = data;

  let riskScore = 0.3;
  const factors = [];

  // Return rate
  if (orderHistory) {
    const returnRate = orderHistory.total > 0
      ? orderHistory.returned / orderHistory.total
      : 0;
    riskScore += returnRate * 0.4;
    factors.push(`Return rate: ${Math.round(returnRate * 100)}%`);
  }

  // Return velocity
  if (returnVelocity) {
    const velocity = returnVelocity.returns30d / 10;
    riskScore += Math.min(velocity, 1) * 0.25;
    factors.push(`${returnVelocity.returns30d} returns in 30 days`);
  }

  // Value difference
  if (itemValues) {
    const ratio = itemValues.avgReturnValue / itemValues.avgOrderValue;
    if (ratio > 0.8) {
      riskScore += 0.15;
      factors.push('High-value returns relative to order value');
    }
  }

  riskScore = Math.max(0, Math.min(1, riskScore));

  let risk = 'low';
  let policy = 'free_returns';

  if (riskScore >= 0.6) {
    risk = 'high';
    policy = 'manual_review';
  } else if (riskScore >= 0.4) {
    risk = 'medium';
    policy = 'standard';
  }

  return {
    risk,
    risk_score: Math.round(riskScore * 100) / 100,
    policy_recommendation: policy,
    factors
  };
}

// ============ ROUTES ============

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Main COD recommendation endpoint
app.post('/api/cod/recommend', (req, res) => {
  try {
    const result = calculateCodScore(req.body);
    res.json(result);
  } catch (error) {
    console.error('COD recommendation error:', error);
    res.status(500).json({ error: 'COD recommendation failed', message: error.message });
  }
});

// Batch COD recommendations
app.post('/api/cod/recommend/batch', (req, res) => {
  try {
    const { inputs } = req.body;

    if (!Array.isArray(inputs)) {
      return res.status(400).json({ error: 'inputs must be an array' });
    }

    const recommendations = inputs.map(input => calculateCodScore(input));

    res.json({ recommendations });
  } catch (error) {
    console.error('Batch COD recommendation error:', error);
    res.status(500).json({ error: 'Batch recommendation failed', message: error.message });
  }
});

// Return risk assessment
app.post('/api/cod/return-risk', (req, res) => {
  try {
    const result = calculateReturnRisk(req.body);
    res.json(result);
  } catch (error) {
    console.error('Return risk error:', error);
    res.status(500).json({ error: 'Return risk assessment failed', message: error.message });
  }
});

// Get customer COD history
app.get('/api/cod/history/:customerId', (req, res) => {
  const history = codHistory.get(req.params.customerId);

  if (!history) {
    return res.status(404).json({ error: 'Customer COD history not found' });
  }

  res.json(history);
});

// Update COD decision (after delivery attempt)
app.post('/api/cod/update', (req, res) => {
  const { customerId, orderId, outcome, amount } = req.body;

  if (!customerId || !orderId || !outcome) {
    return res.status(400).json({ error: 'customerId, orderId, and outcome are required' });
  }

  // Store the outcome for future scoring
  const key = `${customerId}:${orderId}`;
  codHistory.set(key, {
    customerId,
    orderId,
    outcome, // 'completed', 'returned', 'cancelled', 'failed_delivery'
    amount,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

// Get COD statistics
app.get('/api/cod/stats', (req, res) => {
  const stats = {
    totalAssessments: codHistory.size,
    lastUpdated: new Date().toISOString()
  };

  res.json(stats);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START ============

if (!NO_LISTEN) {
  app.listen(PORT, () => {
    console.log(`COD Intelligence Service listening on port ${PORT}`);
    console.log(`Service: ${SERVICE_NAME}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

module.exports = app;
