/**
 * HOJAI Return Risk Engine
 *
 * Detects return abuse and recommends appropriate return policies.
 * Critical for reducing D2C brand losses from return fraud.
 *
 * Port: 4899
 *
 * @author HOJAI AI
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4899;
const SERVICE_NAME = 'return-risk-engine';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory store for return history
const returnHistory = new Map();

/**
 * Calculate return risk score
 */
function calculateReturnRisk(data) {
  const {
    customerId,
    orderHistory,
    returnVelocity,
    itemValues,
    returnReasons,
    accountAge
  } = data;

  let riskScore = 0.3; // Base risk
  const factors = [];
  const abuseIndicators = [];

  // Return Rate (40% weight)
  if (orderHistory) {
    const { orders, returns } = orderHistory;
    const returnRate = orders > 0 ? returns / orders : 0;

    riskScore += returnRate * 0.4;
    factors.push({
      name: 'return_rate',
      impact: 0.4,
      value: `${Math.round(returnRate * 100)}%`,
      description: `${returns} returns out of ${orders} orders`
    });

    if (returnRate > 0.5) {
      abuseIndicators.push('Excessive return rate (>50%)');
    } else if (returnRate > 0.3) {
      abuseIndicators.push('High return rate (>30%)');
    }
  }

  // Return Velocity (25% weight)
  if (returnVelocity) {
    const { returns7d, returns30d } = returnVelocity;

    // Calculate velocity score
    const velocityScore = Math.min(returns30d / 10, 1);
    riskScore += velocityScore * 0.25;

    factors.push({
      name: 'return_velocity',
      impact: 0.25,
      value: `${returns30d} returns in 30 days`,
      description: 'Recent return frequency'
    });

    // Check for burst patterns (returns in short time)
    if (returns7d >= 2) {
      abuseIndicators.push('Burst return pattern detected');
    }

    if (returns30d > 5) {
      abuseIndicators.push('Very high return frequency');
    }
  }

  // Value Difference (15% weight)
  if (itemValues) {
    const { avgOrderValue, avgReturnValue } = itemValues;
    const valueRatio = avgOrderValue > 0 ? avgReturnValue / avgOrderValue : 0;

    if (valueRatio > 0.9) {
      riskScore += 0.15;
      abuseIndicators.push('High-value item returns (returning most of order value)');
    } else if (valueRatio > 0.7) {
      riskScore += 0.08;
    }

    factors.push({
      name: 'value_difference',
      impact: 0.15,
      value: `${Math.round(valueRatio * 100)}% return rate by value`,
      description: 'Return value relative to order value'
    });
  }

  // Return Reasons Analysis (10% weight)
  if (returnReasons && returnReasons.length > 0) {
    const suspiciousReasons = [
      'better_price_found',
      'found_cheaper',
      'no_longer_needed',
      'changed_mind',
      'wrong_size'
    ];

    const suspiciousCount = returnReasons.filter(r =>
      suspiciousReasons.includes(r.toLowerCase())
    ).length;

    const suspiciousRatio = suspiciousCount / returnReasons.length;

    riskScore += suspiciousRatio * 0.1;
    factors.push({
      name: 'return_reason_pattern',
      impact: 0.1,
      value: `${suspiciousCount} suspicious reasons out of ${returnReasons.length}`,
      description: 'Pattern of return reasons'
    });
  }

  // Account Age Factor (10% weight)
  if (accountAge) {
    // New accounts have higher risk
    const ageFactor = Math.max(0, 1 - (accountAge / 180));
    riskScore += ageFactor * 0.1;

    factors.push({
      name: 'account_age',
      impact: 0.1,
      value: `${accountAge} days`,
      description: 'Account tenure'
    });

    if (accountAge < 30) {
      abuseIndicators.push('New account with high returns');
    }
  }

  // Clamp risk score
  riskScore = Math.max(0, Math.min(1, riskScore));

  // Determine risk level
  let risk = 'low';
  let policy = 'free_returns';

  if (riskScore >= 0.6) {
    risk = 'high';
    policy = 'manual_review';
  } else if (riskScore >= 0.4) {
    risk = 'medium';
    policy = 'standard';
  }

  // Calculate abuse probability
  const abuseProbability = riskScore >= 0.5
    ? riskScore * 0.6
    : riskScore * 0.3;

  // Generate factors explanation
  const riskFactors = factors.map(f =>
    `${f.name}: ${f.value}`
  );

  if (abuseIndicators.length > 0) {
    riskFactors.push(...abuseIndicators);
  }

  // Store for future reference
  if (customerId) {
    returnHistory.set(customerId, {
      riskScore,
      risk,
      policy,
      timestamp: new Date().toISOString()
    });
  }

  return {
    risk,
    abuse_probability: Math.round(abuseProbability * 100) / 100,
    policy_recommendation: policy,
    factors: riskFactors,
    confidence: Math.round((1 - riskScore) * 100) / 100,
    indicators: abuseIndicators
  };
}

/**
 * Detect specific abuse patterns
 */
function detectAbusePatterns(data) {
  const patterns = [];
  const { orderHistory, returnVelocity, returnReasons, itemValues } = data;

  // Pattern 1: Same-day returns
  if (returnVelocity?.sameDayReturns > 0) {
    patterns.push({
      type: 'SAME_DAY_RETURNS',
      severity: 'high',
      description: `${returnVelocity.sameDayReturns} same-day returns detected`,
      recommendation: 'Require manual review for same-day returns'
    });
  }

  // Pattern 2: Wardrobing (buying, wearing, returning)
  if (orderHistory) {
    const returnRate = orderHistory.orders > 0
      ? orderHistory.returns / orderHistory.orders
      : 0;
    if (returnRate > 0.6 && returnReasons?.some(r =>
      ['wrong_size', 'fit_issues', 'doesnt_fit'].includes(r.toLowerCase())
    )) {
      patterns.push({
        type: 'WARDROBING',
        severity: 'high',
        description: 'High return rate with sizing issues - possible wardrobing',
        recommendation: 'Consider size guide enforcement or exchange-only policy'
      });
    }
  }

  // Pattern 3: Price arbitrage (returning after using elsewhere)
  if (returnReasons?.some(r =>
    ['used', 'damaged', 'altered'].includes(r.toLowerCase())
  )) {
    patterns.push({
      type: 'USED_ITEM_RETURN',
      severity: 'critical',
      description: 'Returns marked as used, damaged, or altered',
      recommendation: 'Deny return and flag for review'
    });
  }

  // Pattern 4: Sequential returns (one after another)
  if (returnVelocity?.returns7d >= 3) {
    patterns.push({
      type: 'SEQUENTIAL_RETURNS',
      severity: 'medium',
      description: `${returnVelocity.returns7d} returns in 7 days - sequential pattern`,
      recommendation: 'Require cooldown period between orders and returns'
    });
  }

  // Pattern 5: High-value item returns
  if (itemValues && itemValues.avgReturnValue > 5000) {
    const ratio = itemValues.avgOrderValue > 0
      ? itemValues.avgReturnValue / itemValues.avgOrderValue
      : 0;
    if (ratio > 0.8) {
      patterns.push({
        type: 'HIGH_VALUE_RETURNS',
        severity: 'medium',
        description: `High-value returns (₹${itemValues.avgReturnValue})`,
        recommendation: 'Document condition carefully; consider partial refund'
      });
    }
  }

  return patterns;
}

// ============ ROUTES ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/returns/risk', (req, res) => {
  try {
    const result = calculateReturnRisk(req.body);
    res.json(result);
  } catch (error) {
    console.error('Return risk error:', error);
    res.status(500).json({ error: 'Return risk assessment failed', message: error.message });
  }
});

app.post('/api/returns/risk/batch', (req, res) => {
  try {
    const { inputs } = req.body;

    if (!Array.isArray(inputs)) {
      return res.status(400).json({ error: 'inputs must be an array' });
    }

    const assessments = inputs.map(input => calculateReturnRisk(input));
    res.json({ assessments });
  } catch (error) {
    console.error('Batch return risk error:', error);
    res.status(500).json({ error: 'Batch assessment failed', message: error.message });
  }
});

app.post('/api/returns/patterns', (req, res) => {
  try {
    const patterns = detectAbusePatterns(req.body);
    res.json({ patterns });
  } catch (error) {
    console.error('Pattern detection error:', error);
    res.status(500).json({ error: 'Pattern detection failed', message: error.message });
  }
});

app.get('/api/returns/history/:customerId', (req, res) => {
  const history = returnHistory.get(req.params.customerId);

  if (!history) {
    return res.status(404).json({ error: 'Customer return history not found' });
  }

  res.json(history);
});

app.post('/api/returns/update', (req, res) => {
  const { customerId, orderId, outcome, reason } = req.body;

  if (!customerId || !orderId) {
    return res.status(400).json({ error: 'customerId and orderId are required' });
  }

  const key = `${customerId}:${orderId}`;
  returnHistory.set(key, {
    customerId,
    orderId,
    outcome,
    reason,
    timestamp: new Date().toISOString()
  });

  res.json({ success: true });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

if (!NO_LISTEN) {
  app.listen(PORT, () => {
    console.log(`Return Risk Engine listening on port ${PORT}`);
    console.log(`Service: ${SERVICE_NAME}`);
  });
}

module.exports = app;
