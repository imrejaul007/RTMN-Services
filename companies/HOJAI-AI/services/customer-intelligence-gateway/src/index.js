/**
 * HOJAI Customer Intelligence Gateway
 *
 * Unified API entry point for all customer intelligence modules.
 * Provides a single endpoint for full customer analysis.
 *
 * Port: 4896
 *
 * @author HOJAI AI
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4896;
const SERVICE_NAME = 'customer-intelligence-gateway';

// Skip HTTP server in test mode
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();

// ============ MIDDLEWARE ============

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ============ IN-MEMORY STORES ============

// Customer profiles cache
const customerProfiles = new Map();

// Analysis cache (customer_id -> analysis result)
const analysisCache = new Map();

// Usage tracking
const usageLog = [];

// ============ SCORING ENGINES ============

/**
 * Calculate trust score
 */
function calculateTrustScore(data) {
  const { orderHistory, supportHistory, accountAge, paymentHistory } = data;

  let score = 50; // Base score
  const factors = [];

  // Order completion rate (30% weight)
  if (orderHistory) {
    const completionRate = orderHistory.total > 0
      ? orderHistory.completed / orderHistory.total
      : 0.5;
    const orderContribution = completionRate * 30;
    score += orderContribution - 15; // Normalize around 50
    factors.push({
      name: 'order_completion_rate',
      contribution: completionRate - 0.5,
      value: `${Math.round(completionRate * 100)}%`,
      description: 'Order completion history'
    });
  }

  // Return rate (20% weight, negative)
  if (orderHistory) {
    const returnRate = orderHistory.total > 0
      ? orderHistory.returned / orderHistory.total
      : 0;
    const returnContribution = -returnRate * 20;
    score += returnContribution;
    factors.push({
      name: 'return_rate',
      contribution: -returnRate,
      value: `${Math.round(returnRate * 100)}%`,
      description: 'Product return history'
    });
  }

  // Support tickets (15% weight, negative)
  if (supportHistory) {
    const ticketRate = Math.min(supportHistory.tickets / 20, 1);
    const supportContribution = -ticketRate * 15;
    score += supportContribution;
    factors.push({
      name: 'support_ticket_rate',
      contribution: -ticketRate,
      value: `${supportHistory.tickets} tickets`,
      description: 'Support interaction frequency'
    });
  }

  // Account age (15% weight)
  if (accountAge) {
    const ageFactor = Math.min(accountAge / 365, 1);
    const ageContribution = ageFactor * 15;
    score += ageContribution - 7.5;
    factors.push({
      name: 'account_age',
      contribution: ageFactor - 0.5,
      value: `${accountAge} days`,
      description: 'Account tenure'
    });
  }

  // Payment history (20% weight)
  if (paymentHistory) {
    const paymentSuccessRate = paymentHistory.successful + paymentHistory.failed > 0
      ? paymentHistory.successful / (paymentHistory.successful + paymentHistory.failed)
      : 0.5;
    const paymentContribution = paymentSuccessRate * 20;
    score += paymentContribution - 10;
    factors.push({
      name: 'payment_history',
      contribution: paymentSuccessRate - 0.5,
      value: `${Math.round(paymentSuccessRate * 100)}% success`,
      description: 'Payment success rate'
    });
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Determine level
  let level = 'low';
  if (score >= 80) level = 'trusted';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';

  // Determine badge
  let badge = 'new';
  if (score >= 80) badge = 'vip';
  else if (score >= 60) badge = 'trusted';
  else if (accountAge && accountAge > 30) badge = 'verified';

  return { score, level, badge, factors };
}

/**
 * Calculate COD recommendation
 */
function calculateCodRecommendation(data) {
  const { orderHistory, addressHistory, deviceHistory, purchaseAmount, category } = data;

  let score = 0.5;
  const factors = [];
  const reasons = [];

  // COD success rate (35% weight)
  if (orderHistory) {
    const codSuccessRate = orderHistory.total > 0
      ? orderHistory.completed / orderHistory.total
      : 0.5;
    score += (codSuccessRate - 0.5) * 0.35 * 2;
    factors.push({
      name: 'cod_success_rate',
      impact: 0.35,
      value: `${Math.round(codSuccessRate * 100)}%`,
      description: 'Historical COD completion rate'
    });
    if (codSuccessRate >= 0.9) reasons.push('Excellent COD completion history');
    else if (codSuccessRate < 0.7) reasons.push('Concerning COD completion history');
  }

  // Address stability (20% weight)
  if (addressHistory) {
    const stability = Math.max(0, 1 - addressHistory.changes90d / 5);
    score += (stability - 0.5) * 0.2 * 2;
    factors.push({
      name: 'address_stability',
      impact: 0.2,
      value: stability >= 0.8 ? 'stable' : 'unstable',
      description: 'Address change frequency'
    });
    if (stability >= 0.8) reasons.push('Stable delivery address');
  }

  // Device consistency (10% weight)
  if (deviceHistory) {
    const consistency = Math.max(0, 1 - deviceHistory.changes30d / 3);
    score += (consistency - 0.5) * 0.1 * 2;
    factors.push({
      name: 'device_consistency',
      impact: 0.1,
      value: consistency >= 0.7 ? 'consistent' : 'inconsistent',
      description: 'Device change frequency'
    });
  }

  // Order value risk (15% weight)
  if (purchaseAmount) {
    const valueRisk = purchaseAmount > 10000 ? 0.3 : purchaseAmount > 5000 ? 0.1 : 0;
    score -= valueRisk * 0.15 * 2;
    factors.push({
      name: 'order_value_risk',
      impact: 0.15,
      value: `₹${purchaseAmount.toLocaleString()}`,
      description: 'Purchase amount risk factor'
    });
    if (purchaseAmount > 10000) reasons.push('High-value order may require additional verification');
  }

  // Account age factor (10% weight)
  // Would normally check account age, defaulting to neutral
  score += 0.05;
  factors.push({
    name: 'account_factor',
    impact: 0.1,
    value: 'established',
    description: 'Account standing'
  });

  // Clamp score to 0-1
  score = Math.max(0, Math.min(1, score));

  // Determine recommendation
  let recommendation = 'review';
  let allowed = false;
  if (score >= 0.7) {
    recommendation = 'allow';
    allowed = true;
  } else if (score < 0.4) {
    recommendation = 'block';
  }

  const confidence = Math.round(score * 100);

  return { allowed, confidence, recommendation, factors, reasons };
}

/**
 * Calculate return risk
 */
function calculateReturnRisk(data) {
  const { orderHistory, returnVelocity, itemValues } = data;

  let riskScore = 0.3; // Base risk
  const factors = [];

  // Return rate (40% weight)
  if (orderHistory) {
    const returnRate = orderHistory.total > 0
      ? orderHistory.returns / orderHistory.total
      : 0;
    riskScore += returnRate * 0.4;
    factors.push(`Return rate: ${Math.round(returnRate * 100)}%`);
  }

  // Return velocity (25% weight)
  if (returnVelocity) {
    const velocityScore = Math.min(returnVelocity.returns30d / 10, 1);
    riskScore += velocityScore * 0.25;
    factors.push(`Return velocity: ${returnVelocity.returns30d} in 30 days`);
  }

  // Value difference (15% weight)
  if (itemValues) {
    const valueRatio = itemValues.avgReturnValue / itemValues.avgOrderValue;
    if (valueRatio > 0.8) {
      riskScore += 0.15;
      factors.push('High-value returns relative to order value');
    }
  }

  // Clamp risk to 0-1
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

  // Abuse probability is a simplified version of risk score
  const abuseProbability = riskScore >= 0.5 ? riskScore * 0.5 : riskScore * 0.3;

  return {
    risk,
    abuse_probability: Math.round(abuseProbability * 100) / 100,
    policy_recommendation: policy,
    factors,
    confidence: Math.round((1 - riskScore) * 100) / 100
  };
}

/**
 * Calculate support profile
 */
function calculateSupportProfile(data) {
  const { ticketHistory, refundRequests, sentiment } = data;

  // Calculate metrics
  const tickets90d = ticketHistory?.last90d || 0;
  const refundRate = refundRequests && refundRequests.total > 0
    ? refundRequests.denied / refundRequests.total
    : 0;

  // Escalation probability based on tickets and sentiment
  let escalationProb = 0.1;
  if (ticketHistory?.escalations > 0) {
    escalationProb += Math.min(ticketHistory.escalations * 0.1, 0.3);
  }
  if (sentiment === 'negative') {
    escalationProb += 0.2;
  }
  if (tickets90d > 5) {
    escalationProb += 0.1;
  }
  escalationProb = Math.min(escalationProb, 1);

  // Priority
  let priority = 'normal';
  if (escalationProb > 0.5 || tickets90d > 10) priority = 'high';
  else if (escalationProb < 0.2 && tickets90d <= 2) priority = 'low';

  // Recommended tone based on sentiment
  let tone = 'friendly';
  if (sentiment === 'negative') tone = 'empathetic';
  else if (sentiment === 'positive') tone = 'friendly';

  // Preferred channel (default to whatsapp)
  const channel = 'whatsapp';

  // Recommended agent
  let agent = 'ai';
  if (escalationProb > 0.5 || refundRate > 0.3) agent = 'human';
  if (tickets90d > 10) agent = 'specialist';

  // Likely resolution
  let resolution = 'apology';
  if (refundRate > 0.3) resolution = 'refund';
  else if (escalationProb > 0.5) resolution = 'escalate';

  return {
    tickets_90d: tickets90d,
    refund_rate: Math.round(refundRate * 100) / 100,
    sentiment: sentiment || 'neutral',
    escalation_probability: Math.round(escalationProb * 100) / 100,
    priority,
    recommended_tone: tone,
    preferred_channel: channel,
    recommended_agent: agent,
    likely_resolution: resolution,
    wait_time_tolerance: escalationProb > 0.5 ? 'low' : 'medium'
  };
}

/**
 * Calculate selling preferences
 */
function calculateSellingPreferences(data) {
  const { purchaseHistory, browsingHistory, responseHistory } = data;

  // Determine segment
  let segment = 'occasional';
  let segmentDesc = 'Occasional shopper';

  if (purchaseHistory) {
    const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
    if (avgOrdersPerMonth >= 4) {
      segment = 'premium_explorer';
      segmentDesc = 'High-frequency premium buyer who explores new products';
    } else if (avgOrdersPerMonth >= 2) {
      segment = 'loyal_brand';
      segmentDesc = 'Regular buyer with brand loyalty';
    } else if (avgOrdersPerMonth >= 1) {
      segment = 'value_hunter';
      segmentDesc = 'Value-conscious shopper looking for deals';
    }
  }

  // Price sensitivity
  let priceSensitivity = 'medium';
  if (purchaseHistory) {
    const avgOrder = purchaseHistory.avgOrderValue || 0;
    if (avgOrder > 5000) priceSensitivity = 'low';
    else if (avgOrder < 1000) priceSensitivity = 'high';
  }

  // Discount responsiveness
  let discountResponsiveness = 0.5;
  if (responseHistory) {
    const responseRate = responseHistory.offerAcceptances / (responseHistory.campaignClicks || 1);
    discountResponsiveness = Math.min(responseRate, 1);
  }

  // Premium buyer flag
  const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;

  // Preferred categories
  const categories = purchaseHistory?.categories || ['general'];

  // Buying frequency
  let frequency = 'occasional';
  if (purchaseHistory) {
    const ordersPerMonth = purchaseHistory.orderCount / 12;
    if (ordersPerMonth >= 4) frequency = 'weekly';
    else if (ordersPerMonth >= 1) frequency = 'monthly';
    else if (ordersPerMonth >= 0.25) frequency = 'occasional';
  }

  // Next best offer
  let nextOffer = 'membership_upgrade';
  if (premiumBuyer) nextOffer = 'premium_subscription';
  else if (discountResponsiveness > 0.6) nextOffer = 'loyalty_discount';

  // Best channel and time
  const channel = 'whatsapp';
  const time = 'evening';

  // Upsell opportunities
  const upsells = [];
  if (premiumBuyer) upsells.push('premium_subscription', 'exclusive_access');
  if (discountResponsiveness > 0.5) upsells.push('bulk_discount', 'loyalty_points');

  return {
    customer_segment: segment,
    segment_description: segmentDesc,
    price_sensitivity: priceSensitivity,
    discount_responsiveness: Math.round(discountResponsiveness * 100) / 100,
    premium_buyer: premiumBuyer,
    preferred_categories: categories,
    buying_frequency: frequency,
    next_best_offer: nextOffer,
    recommended_channel: channel,
    recommended_time: time,
    upsell_opportunities: upsells
  };
}

/**
 * Calculate loyalty profile
 */
function calculateLoyaltyProfile(data) {
  const { purchaseHistory, engagementHistory } = data;

  // Calculate LTV
  const currentLTV = purchaseHistory?.totalSpend || 0;

  // Project LTV (simplified)
  const ordersPerYear = purchaseHistory?.orderCount / 2 || 0;
  const avgOrderValue = purchaseHistory?.avgOrderValue || currentLTV / Math.max(purchaseHistory?.orderCount || 1, 1);
  const yearlySpend = ordersPerYear * avgOrderValue;

  const predicted1yr = currentLTV + yearlySpend;
  const predicted3yr = currentLTV + (yearlySpend * 3);

  // Determine tier
  let tier = 'bronze';
  if (currentLTV >= 100000) tier = 'vip';
  else if (currentLTV >= 50000) tier = 'platinum';
  else if (currentLTV >= 20000) tier = 'gold';
  else if (currentLTV >= 5000) tier = 'silver';

  // Churn risk (simplified)
  const engagement = engagementHistory?.logins || 0;
  let churnProb = 0.5;
  if (engagement > 50) churnProb = 0.1;
  else if (engagement > 20) churnProb = 0.25;
  else if (engagement < 5) churnProb = 0.7;

  const churnLevel = churnProb > 0.5 ? 'high' : churnProb > 0.3 ? 'medium' : 'low';

  // Retention recommendations
  const retentionRecs = [];
  if (churnProb > 0.3) retentionRecs.push('win-back_offer', 'personalized_reachout');
  if (tier === 'gold' || tier === 'platinum') retentionRecs.push('exclusive_previews', 'vip_support');
  retentionRecs.push('loyalty_points', 'early_access');

  // Membership benefits
  const benefits = [];
  if (tier === 'vip') benefits.push('free_shipping', 'priority_support', 'exclusive_access', 'personal_shopper');
  else if (tier === 'platinum') benefits.push('free_shipping', 'priority_support', 'early_access');
  else if (tier === 'gold') benefits.push('free_shipping', 'birthday_discount');
  else benefits.push('loyalty_points');

  return {
    ltv: {
      current: currentLTV,
      predicted_1yr: Math.round(predicted1yr),
      predicted_3yr: Math.round(predicted3yr)
    },
    ltv_tier: tier,
    churn_risk: {
      probability: Math.round(churnProb * 100) / 100,
      level: churnLevel,
      factors: churnProb > 0.5 ? ['low engagement'] : ['regular activity']
    },
    retention_recommendations: retentionRecs,
    upsell_opportunities: ['membership_upgrade', 'premium_subscription'],
    membership_benefits: benefits
  };
}

/**
 * Calculate communication preferences
 */
function calculateCommunicationPreferences(data) {
  const { channelHistory, sentimentHistory } = data;

  // Preferred channel
  let channel = 'whatsapp';
  if (channelHistory) {
    const channels = [
      { name: 'whatsapp', count: channelHistory.whatsapp || 0 },
      { name: 'email', count: channelHistory.email || 0 },
      { name: 'sms', count: channelHistory.sms || 0 },
      { name: 'push', count: channelHistory.push || 0 }
    ];
    channels.sort((a, b) => b.count - a.count);
    channel = channels[0].name;
  }

  // Preferred tone
  let tone = 'friendly';
  if (sentimentHistory) {
    if (sentimentHistory.negative > sentimentHistory.positive) tone = 'empathetic';
    else if (sentimentHistory.positive > sentimentHistory.negative) tone = 'friendly';
  }

  // Best time
  const bestTime = 'evening';

  // Personalization
  const greetingStyle = tone === 'friendly' ? 'casual' : 'formal';
  const emojiUsage = tone === 'friendly' ? 'medium' : 'none';

  return {
    preferred_channel: channel,
    secondary_channel: 'email',
    preferred_tone: tone,
    best_time: bestTime,
    language: 'english',
    personalization: {
      greeting_style: greetingStyle,
      emoji_usage: emojiUsage,
      personalization_level: 'standard'
    }
  };
}

/**
 * Calculate risk scores
 */
function calculateRiskScores(data) {
  // Simplified fraud probability based on available data
  let fraudProb = 0.05;

  if (data.orderHistory) {
    const returnRate = data.orderHistory.total > 0
      ? data.orderHistory.returned / data.orderHistory.total
      : 0;
    if (returnRate > 0.5) fraudProb += 0.3;
    else if (returnRate > 0.3) fraudProb += 0.1;
  }

  const fraudLevel = fraudProb > 0.6 ? 'critical' : fraudProb > 0.3 ? 'high' : fraudProb > 0.1 ? 'medium' : 'low';

  // Churn probability (simplified)
  const churnProb = 0.15;
  const churnLevel = churnProb > 0.5 ? 'high' : churnProb > 0.3 ? 'medium' : 'low';

  return {
    fraud_probability: Math.round(fraudProb * 100) / 100,
    fraud_level: fraudLevel,
    churn_probability: churnProb,
    churn_level: churnLevel
  };
}

/**
 * Calculate customer segments
 */
function calculateSegments(data) {
  const { purchaseHistory, engagementHistory } = data;

  // Value segment
  let value = 'new';
  if (purchaseHistory) {
    if (purchaseHistory.totalSpend > 50000) value = 'vip';
    else if (purchaseHistory.totalSpend > 20000) value = 'high_value';
    else if (purchaseHistory.totalSpend > 5000) value = 'regular';
    else if (purchaseHistory.totalSpend > 0) value = 'at_risk';
  }

  // Behavior segment
  let behavior = 'new';
  if (purchaseHistory) {
    const ordersPerYear = purchaseHistory.orderCount / 2;
    if (ordersPerYear >= 4) behavior = 'frequent';
    else if (ordersPerYear >= 1) behavior = 'occasional';
    else behavior = 'dormant';
  }

  // Engagement segment
  let engagement = 'unengaged';
  if (engagementHistory) {
    if (engagementHistory.logins > 50) engagement = 'highly_engaged';
    else if (engagementHistory.logins > 20) engagement = 'engaged';
    else if (engagementHistory.logins > 5) engagement = 'passive';
  }

  return {
    value,
    behavior,
    demographic: 'young_professional',
    engagement
  };
}

// ============ ANALYZE ENDPOINT ============

/**
 * Full customer analysis
 */
async function analyzeCustomer(input) {
  const { phone, email, deviceId, merchantId } = input;

  // Generate or look up customer ID
  const customerId = `cust_${uuidv4().slice(0, 12)}`;

  // Calculate all scores
  const trustScore = calculateTrustScore({
    orderHistory: input.orderHistory,
    supportHistory: input.supportHistory,
    accountAge: input.accountAge,
    paymentHistory: input.paymentHistory
  });

  const codRecommendation = calculateCodRecommendation({
    orderHistory: input.orderHistory,
    addressHistory: input.addressHistory,
    deviceHistory: input.deviceHistory,
    purchaseAmount: input.purchaseAmount,
    category: input.category
  });

  const returnRisk = calculateReturnRisk({
    orderHistory: input.orderHistory,
    returnVelocity: input.returnVelocity,
    itemValues: input.itemValues
  });

  const supportProfile = calculateSupportProfile({
    ticketHistory: input.ticketHistory,
    refundRequests: input.refundRequests,
    sentiment: input.sentiment
  });

  const sellingPrefs = calculateSellingPreferences({
    purchaseHistory: input.purchaseHistory,
    browsingHistory: input.browsingHistory,
    responseHistory: input.responseHistory
  });

  const loyaltyProfile = calculateLoyaltyProfile({
    purchaseHistory: input.purchaseHistory,
    engagementHistory: input.engagementHistory
  });

  const commPrefs = calculateCommunicationPreferences({
    channelHistory: input.channelHistory,
    sentimentHistory: input.sentimentHistory
  });

  const riskScores = calculateRiskScores({
    orderHistory: input.orderHistory
  });

  const segments = calculateSegments({
    purchaseHistory: input.purchaseHistory,
    engagementHistory: input.engagementHistory
  });

  // Build response
  const response = {
    customer_id: customerId,
    trust_score: trustScore.score,
    trust_level: trustScore.level,
    cod_recommendation: codRecommendation,
    return_risk: returnRisk,
    support_profile: supportProfile,
    selling_preferences: sellingPrefs,
    loyalty: loyaltyProfile,
    communication: commPrefs,
    risk: riskScores,
    segments,
    analyzed_at: new Date().toISOString(),
    confidence: 0.92
  };

  // Cache result
  analysisCache.set(customerId, response);
  customerProfiles.set(customerId, {
    phone,
    email,
    deviceId,
    merchantId,
    lastAnalysis: response
  });

  return response;
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

// Full customer analysis
app.post('/api/customer/analyze', async (req, res) => {
  try {
    const result = await analyzeCustomer(req.body);
    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed', message: error.message });
  }
});

// Get customer by ID
app.get('/api/customer/:id', (req, res) => {
  const profile = customerProfiles.get(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({ customer_id: req.params.id, ...profile });
});

// Track event
app.post('/api/customer/:id/events', (req, res) => {
  const profile = customerProfiles.get(req.params.id);
  if (!profile) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  // Store event (in real implementation, would update the customer profile)
  res.json({ success: true, event: req.body });
});

// Trust score endpoint
app.post('/api/trust/score', (req, res) => {
  try {
    const result = calculateTrustScore(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Trust scoring failed', message: error.message });
  }
});

// COD recommendation endpoint
app.post('/api/cod/recommend', (req, res) => {
  try {
    const result = calculateCodRecommendation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'COD recommendation failed', message: error.message });
  }
});

// Return risk endpoint
app.post('/api/returns/risk', (req, res) => {
  try {
    const result = calculateReturnRisk(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Return risk assessment failed', message: error.message });
  }
});

// Support profile endpoint
app.post('/api/support/profile', (req, res) => {
  try {
    const result = calculateSupportProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Support profile generation failed', message: error.message });
  }
});

// Sales preferences endpoint
app.post('/api/sales/preferences', (req, res) => {
  try {
    const result = calculateSellingPreferences(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Sales preferences generation failed', message: error.message });
  }
});

// Loyalty profile endpoint
app.post('/api/loyalty/profile', (req, res) => {
  try {
    const result = calculateLoyaltyProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Loyalty profile generation failed', message: error.message });
  }
});

// Communication preferences endpoint
app.post('/api/communication/preferences', (req, res) => {
  try {
    const result = calculateCommunicationPreferences(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Communication preferences generation failed', message: error.message });
  }
});

// Risk scores endpoint
app.post('/api/risk/scores', (req, res) => {
  try {
    const result = calculateRiskScores(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Risk scoring failed', message: error.message });
  }
});

// Recommendations endpoint
app.post('/api/recommend', (req, res) => {
  const { context, available } = req.body;

  // Generate simple recommendations
  const recommendations = [];

  if (context === 'checkout') {
    recommendations.push({
      action: 'offer_membership',
      type: 'offer',
      score: 0.85,
      reason: 'High-value customer likely to benefit from membership',
      personalization: { discount: '10% off annual' }
    });
    recommendations.push({
      action: 'free_shipping',
      type: 'offer',
      score: 0.75,
      reason: 'Encourage completion for high-value orders',
      personalization: {}
    });
  } else if (context === 'marketing') {
    recommendations.push({
      action: 'personalized_offer',
      type: 'offer',
      score: 0.9,
      reason: 'Based on purchase history and preferences',
      personalization: { segment: 'premium_explorer' }
    });
  }

  res.json({
    recommendations,
    next_best_action: {
      action: recommendations[0]?.action || 'no_action',
      confidence: recommendations[0]?.score || 0,
      alternatives: recommendations.slice(1).map(r => r.action)
    },
    generated_at: new Date().toISOString()
  });
});

// Next best action endpoint
app.post('/api/recommend/next-best-action', (req, res) => {
  const { customerId, context } = req.body;

  // Simple next best action logic
  let action = 'send_personalized_offer';
  let confidence = 0.8;
  const alternatives = ['send_loyalty_points', 'offer_early_access'];

  res.json({ action, confidence, alternatives });
});

// Graph resolve endpoint
app.post('/api/graph/resolve', (req, res) => {
  const { phone, email, deviceId } = req.body;

  // Simple identity resolution
  const customerId = `cust_${uuidv4().slice(0, 12)}`;

  res.json({
    customerId,
    confidence: 0.95,
    merged_ids: [],
    sources: phone ? ['phone'] : email ? ['email'] : []
  });
});

// Identity resolve endpoint
app.post('/api/identity/resolve', (req, res) => {
  const { phone, email, deviceId } = req.body;

  const customerId = `cust_${uuidv4().slice(0, 12)}`;

  res.json({
    customerId,
    confidence: 0.95,
    merged_ids: [],
    sources: phone ? ['phone'] : email ? ['email'] : []
  });
});

// Usage tracking
app.post('/api/usage/track', (req, res) => {
  usageLog.push({
    ...req.body,
    timestamp: new Date().toISOString()
  });
  res.json({ success: true });
});

// Usage report
app.get('/api/usage/report', (req, res) => {
  const { startDate, endDate } = req.query;

  const filtered = usageLog.filter(u => {
    const ts = new Date(u.timestamp);
    return ts >= new Date(startDate) && ts <= new Date(endDate);
  });

  const byOperation = {};
  filtered.forEach(u => {
    byOperation[u.operation] = (byOperation[u.operation] || 0) + 1;
  });

  res.json({
    startDate,
    endDate,
    totalCalls: filtered.length,
    byOperation,
    byDay: {}
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ START SERVER ============

if (!NO_LISTEN) {
  app.listen(PORT, () => {
    console.log(`Customer Intelligence Gateway listening on port ${PORT}`);
    console.log(`Service: ${SERVICE_NAME}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

// Export for testing
module.exports = app;
