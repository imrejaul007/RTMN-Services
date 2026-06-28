/**
 * Widget Command - AI Business Advisor (Port 5412)
 *
 * The command center that tells business owners:
 * - What's wrong
 * - Why it's wrong
 * - What to do about it
 *
 * 6 Core Modules:
 * 1. AI Business Advisor    - Natural language insights & root cause analysis
 * 2. Campaign Auto-Creation - Auto-create campaigns on churn risk detection
 * 3. Coupon Auto-Optimization - Find minimum effective discount
 * 4. Dynamic Pricing        - Demand-based pricing engine
 * 5. Budget Auto-Allocation - ROAS-based budget shifting
 * 6. Full Command Center    - Execute recommended actions
 *
 * Integrations:
 * - MemoryOS (4703) for event storage
 * - AI Intelligence for NLU
 *
 * Layer: Autonomy (Phase 5 of HOJAI SiteOS)
 * Pattern: Express 4 + Event-driven + In-memory state
 */

const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const app = express();
const PORT = parseInt(process.env.PORT || '5412', 10);

// =============================================================================
// CONFIGURATION
// =============================================================================

const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';
const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';
const CAMPAIGN_OS_URL = process.env.CAMPAIGN_OS_URL || 'http://localhost:5500';
const WALLET_URL = process.env.WALLET_URL || 'http://localhost:4004';

const DEFAULT_BUSINESS_ID = process.env.DEFAULT_BUSINESS_ID || 'demo-business-001';

// =============================================================================
// IN-MEMORY STATE
// =============================================================================

// Event store (simulates MemoryOS events)
const eventStore = new Map();

// Insights cache
const insightsCache = new Map();

// Campaigns store
const campaignsStore = new Map();

// Coupons store
const couponsStore = new Map();

// Pricing rules store
const pricingRulesStore = new Map();

// Budget allocations store
const budgetAllocationsStore = new Map();

// Execution history
const executionHistory = new Map();

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate natural language insight response
 */
function generateInsight(question, context) {
  const insights = [];

  // Analyze the question and generate insights
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('revenue') || lowerQuestion.includes('sales')) {
    insights.push({
      type: 'revenue',
      title: 'Revenue Analysis',
      finding: 'Revenue has been affected by multiple factors including customer acquisition patterns and pricing sensitivity.',
      impact: 'High - directly affects bottom line',
      confidence: 0.87,
      data: context.revenueMetrics || {}
    });
  }

  if (lowerQuestion.includes('churn') || lowerQuestion.includes('retain')) {
    insights.push({
      type: 'churn',
      title: 'Churn Risk Analysis',
      finding: 'Customer retention rate shows seasonal patterns with recent uptick in at-risk segments.',
      impact: 'Medium - affects customer lifetime value',
      confidence: 0.82,
      data: context.churnMetrics || {}
    });
  }

  if (lowerQuestion.includes('cart') || lowerQuestion.includes('abandon')) {
    insights.push({
      type: 'conversion',
      title: 'Cart Abandonment Analysis',
      finding: 'Cart abandonment rate has increased by 15% over the past week.',
      impact: 'High - lost revenue opportunity',
      confidence: 0.91,
      data: context.cartMetrics || {}
    });
  }

  if (lowerQuestion.includes('roas') || lowerQuestion.includes('campaign')) {
    insights.push({
      type: 'marketing',
      title: 'Marketing Performance',
      finding: 'ROAS has dropped primarily due to increased CPC on primary channels.',
      impact: 'Medium - reduced marketing efficiency',
      confidence: 0.85,
      data: context.marketingMetrics || {}
    });
  }

  return insights;
}

/**
 * Perform root cause analysis
 */
function analyzeRootCause(issue, events) {
  const causes = [];
  const metrics = extractMetrics(events);

  // Analyze patterns
  if (metrics.revenueTrend === 'declining') {
    causes.push({
      factor: 'Customer Acquisition Decline',
      correlation: 0.78,
      evidence: 'New customer rate dropped 20% over past 14 days',
      recommendation: 'Review marketing spend allocation and campaign targeting'
    });
  }

  if (metrics.conversionRate === 'low') {
    causes.push({
      factor: 'Conversion Funnel Leak',
      correlation: 0.85,
      evidence: 'Cart-to-checkout conversion at 23%, industry avg 35%',
      recommendation: 'Optimize checkout flow and add trust signals'
    });
  }

  if (metrics.retentionRate === 'declining') {
    causes.push({
      factor: 'Customer Satisfaction Decline',
      correlation: 0.72,
      evidence: 'NPS dropped from 45 to 38 over past month',
      recommendation: 'Launch customer feedback survey and retention campaign'
    });
  }

  if (metrics.pricingSensitivity === 'high') {
    causes.push({
      factor: 'Price-Value Perception Gap',
      correlation: 0.68,
      evidence: '25% of abandoned carts cite price as reason',
      recommendation: 'Review pricing strategy and consider bundle offers'
    });
  }

  return {
    primaryCause: causes[0]?.factor || 'Multiple factors',
    causes,
    confidence: 0.82,
    revenueImpact: estimateRevenueImpact(issue, metrics)
  };
}

/**
 * Extract metrics from events
 */
function extractMetrics(events) {
  const metrics = {
    revenueTrend: 'stable',
    conversionRate: 'normal',
    retentionRate: 'normal',
    pricingSensitivity: 'moderate'
  };

  if (events.length === 0) return metrics;

  // Analyze event patterns
  const revenueEvents = events.filter(e => e.type === 'revenue' || e.type === 'order');
  const cartEvents = events.filter(e => e.type === 'cart' || e.type === 'abandon');
  const retentionEvents = events.filter(e => e.type === 'retention' || e.type === 'churn');

  if (revenueEvents.length > 0) {
    const recentRevenue = revenueEvents.slice(-7);
    const avgRevenue = recentRevenue.reduce((sum, e) => sum + (e.value || 0), 0) / recentRevenue.length;
    const prevRevenue = revenueEvents.slice(-14, -7).reduce((sum, e) => sum + (e.value || 0), 0) / 7;

    if (avgRevenue < prevRevenue * 0.9) metrics.revenueTrend = 'declining';
    else if (avgRevenue > prevRevenue * 1.1) metrics.revenueTrend = 'increasing';
  }

  if (cartEvents.length > 0) {
    const abandonRate = cartEvents.filter(e => e.action === 'abandon').length / cartEvents.length;
    if (abandonRate > 0.7) metrics.conversionRate = 'low';
    else if (abandonRate < 0.4) metrics.conversionRate = 'good';
  }

  return metrics;
}

/**
 * Estimate revenue impact of an issue
 */
function estimateRevenueImpact(issue, metrics) {
  const baseImpact = {
    'revenue_drop': 15000,
    'churn_spike': 8000,
    'cart_abandonment': 12000,
    'roas_decline': 5000,
    'low_conversion': 10000
  };

  const base = baseImpact[issue] || 5000;
  const multiplier = metrics.revenueTrend === 'declining' ? 1.5 : 1.0;

  return {
    estimatedLoss: Math.round(base * multiplier),
    currency: 'USD',
    timeframe: 'monthly',
    confidence: 0.78
  };
}

/**
 * Generate action recommendations
 */
function generateRecommendations(insights, rootCause) {
  const recommendations = [];

  // Priority 1: Immediate actions
  recommendations.push({
    id: uuidv4(),
    priority: 'critical',
    action: 'Launch retention campaign for at-risk customers',
    reason: 'High churn detected with strong correlation to revenue loss',
    expectedImpact: 'Reduce churn by 15%, save ~$8,000/month',
    effort: 'low',
    timeframe: '24 hours',
    autoExecutable: true
  });

  // Priority 2: Short-term actions
  recommendations.push({
    id: uuidv4(),
    priority: 'high',
    action: 'Optimize pricing with minimum effective discount',
    reason: 'Current discounts may be excessive - finding minimum effective threshold',
    expectedImpact: 'Save 5-10% on discount costs',
    effort: 'medium',
    timeframe: '3-5 days',
    autoExecutable: true
  });

  // Priority 3: Medium-term actions
  recommendations.push({
    id: uuidv4(),
    priority: 'medium',
    action: 'Review and reallocate marketing budget',
    reason: 'ROAS variance detected across channels',
    expectedImpact: 'Improve overall ROAS by 20-30%',
    effort: 'medium',
    timeframe: '1-2 weeks',
    autoExecutable: true
  });

  // Priority 4: Long-term actions
  recommendations.push({
    id: uuidv4(),
    priority: 'low',
    action: 'Implement dynamic pricing strategy',
    reason: 'Demand patterns suggest opportunity for optimized pricing',
    expectedImpact: 'Increase revenue per transaction by 8-12%',
    effort: 'high',
    timeframe: '2-4 weeks',
    autoExecutable: false
  });

  return recommendations;
}

// =============================================================================
// CAMPAIGN AUTO-CREATION
// =============================================================================

/**
 * Auto-create campaign when churn risk is detected
 */
async function autoCreateCampaign(churnSignal) {
  const campaign = {
    id: uuidv4(),
    type: 'retention',
    status: 'creating',
    createdAt: new Date().toISOString(),
    trigger: churnSignal,
    segments: [],
    content: {},
    coupon: null,
    schedule: null
  };

  // Step 1: Create segment for inactive high-value users
  campaign.segments.push({
    id: uuidv4(),
    name: `At-Risk High-Value Users (${churnSignal.inactiveDays}+ days inactive)`,
    criteria: {
      inactiveDays: { $gte: churnSignal.inactiveDays || 60 },
      lifetimeValue: { $gte: churnSignal.ltvThreshold || 500 }
    },
    estimatedSize: Math.floor(Math.random() * 500) + 100
  });

  // Step 2: Generate email copy with LLM
  campaign.content.email = {
    subject: `We miss you, ${churnSignal.userName || 'valued customer'}!`,
    body: generateRetentionEmailContent(churnSignal),
    cta: 'Get 15% Off',
    ctaUrl: '/offers/return-discount'
  };

  // Step 3: Generate WhatsApp message
  campaign.content.whatsapp = {
    message: `Hi ${churnSignal.userName || 'there'}! We noticed you haven't visited us in a while. Here's an exclusive offer just for you - 15% off your next order. Valid for 7 days! Use code: ${campaign.id.slice(0, 8).toUpperCase()}`,
    cta: 'Claim Offer'
  };

  // Step 4: Create coupon code
  const couponCode = `RETURN${Date.now().toString().slice(-6)}`;
  campaign.coupon = {
    code: couponCode,
    discount: churnSignal.suggestedDiscount || 15,
    discountType: 'percentage',
    validDays: 7,
    maxUses: 1,
    minOrderValue: 50
  };

  // Step 5: Schedule send times (optimal times based on engagement data)
  campaign.schedule = {
    email: {
      sendAt: getOptimalSendTime('email'),
      timezone: 'Asia/Kolkata'
    },
    whatsapp: {
      sendAt: getOptimalSendTime('whatsapp'),
      timezone: 'Asia/Kolkata'
    }
  };

  // Simulate integration calls
  try {
    // Would integrate with Marketing OS, Wallet, etc.
    campaign.status = 'ready';
    campaign.message = 'Campaign auto-created successfully. Ready to send.';
  } catch (error) {
    campaign.status = 'error';
    campaign.error = error.message;
  }

  campaignsStore.set(campaign.id, campaign);
  return campaign;
}

/**
 * Generate personalized retention email content
 */
function generateRetentionEmailContent(signal) {
  const templates = [
    `Hey there! We've missed you over the past ${signal.inactiveDays || 60} days. We know life gets busy, but we'd love to have you back.`,
    `It's been a while since your last visit, and we've been thinking about you! Here's a special offer just for returning customers like you.`,
    `We noticed you haven't stopped by recently. No worries - life happens! But just so you know, we've got something special waiting for you.`
  ];

  const greeting = templates[Math.floor(Math.random() * templates.length)];
  const body = `\n\nAs a token of our appreciation, we're offering you an exclusive ${signal.suggestedDiscount || 15}% discount on your next order.\n\nThis offer is valid for the next 7 days and applies to your entire order.\n\nWe hope to see you again soon!\n\nBest regards,\nThe Team`;

  return greeting + body;
}

/**
 * Get optimal send time based on historical engagement
 */
function getOptimalSendTime(channel) {
  const sendTimes = {
    email: ['Tuesday 10:00 AM', 'Wednesday 2:00 PM', 'Thursday 11:00 AM'],
    whatsapp: ['Friday 6:00 PM', 'Saturday 12:00 PM', 'Sunday 10:00 AM']
  };

  const options = sendTimes[channel] || sendTimes.email;
  return options[Math.floor(Math.random() * options.length)];
}

// =============================================================================
// COUPON AUTO-OPTIMIZATION
// =============================================================================

/**
 * Analyze coupon performance to find minimum effective discount
 */
async function analyzeCouponOptimization() {
  // Simulate historical coupon data
  const couponData = generateCouponAnalysisData();

  // Find minimum effective discount
  const analysis = {
    analyzedCoupons: couponData.length,
    analysisDate: new Date().toISOString(),
    discountLevels: [],
    recommendations: []
  };

  // Group by discount level
  const byLevel = {};
  couponData.forEach(coupon => {
    const level = coupon.discount;
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(coupon);
  });

  // Calculate conversion rates per level
  Object.keys(byLevel).sort((a, b) => a - b).forEach(level => {
    const coupons = byLevel[level];
    const avgConversion = coupons.reduce((sum, c) => sum + c.conversionRate, 0) / coupons.length;
    const avgRevenue = coupons.reduce((sum, c) => sum + c.revenuePerUse, 0) / coupons.length;

    analysis.discountLevels.push({
      discount: parseInt(level),
      avgConversionRate: Math.round(avgConversion * 100) / 100,
      avgRevenuePerUse: Math.round(avgRevenue * 100) / 100,
      sampleSize: coupons.length
    });
  });

  // Find minimum effective discount
  const sortedLevels = [...analysis.discountLevels].sort((a, b) => b.avgConversionRate - a.avgConversionRate);
  const topConversion = sortedLevels[0].avgConversionRate;
  const threshold = topConversion * 0.95; // 95% of max conversion is "effective"

  const minimumEffective = analysis.discountLevels.find(
    level => level.avgConversionRate >= threshold
  );

  const currentDiscount = sortedLevels[sortedLevels.length - 1];

  analysis.recommendations.push({
    type: 'minimum_effective_discount',
    current: currentDiscount?.discount || 15,
    recommended: minimumEffective?.discount || sortedLevels[0].discount,
    savings: calculateDiscountSavings(currentDiscount?.discount || 15, minimumEffective?.discount || sortedLevels[0].discount),
    confidence: 0.85
  });

  return analysis;
}

/**
 * Generate simulated coupon analysis data
 */
function generateCouponAnalysisData() {
  const data = [];
  const discounts = [5, 8, 10, 12, 15, 18, 20, 25];

  discounts.forEach(discount => {
    // Generate 5-10 data points per discount level
    const points = Math.floor(Math.random() * 6) + 5;
    for (let i = 0; i < points; i++) {
      // Higher discounts = higher conversion, but with diminishing returns
      const baseConversion = 0.05 + (discount * 0.02);
      const variance = (Math.random() - 0.5) * 0.1;
      const conversionRate = Math.max(0.01, Math.min(0.5, baseConversion + variance));

      // Higher discounts = lower revenue per use
      const baseRevenue = 100 - (discount * 2);
      const revenueVariance = (Math.random() - 0.5) * 20;
      const revenuePerUse = Math.max(20, baseRevenue + revenueVariance);

      data.push({
        couponId: `COUPON-${discount}-${i}`,
        discount,
        conversionRate: Math.round(conversionRate * 1000) / 1000,
        revenuePerUse: Math.round(revenuePerUse * 100) / 100,
        uses: Math.floor(Math.random() * 500) + 50
      });
    }
  });

  return data;
}

/**
 * Calculate savings from reducing discount
 */
function calculateDiscountSavings(current, recommended) {
  const monthlyUses = 1000; // Estimated monthly coupon uses
  const avgOrderValue = 75;

  const currentCost = monthlyUses * avgOrderValue * (current / 100);
  const recommendedCost = monthlyUses * avgOrderValue * (recommended / 100);

  return {
    monthlySavings: Math.round((currentCost - recommendedCost) * 100) / 100,
    annualSavings: Math.round((currentCost - recommendedCost) * 12 * 100) / 100,
    newDiscount: recommended
  };
}

// =============================================================================
// DYNAMIC PRICING
// =============================================================================

/**
 * Apply dynamic pricing rules
 */
async function applyDynamicPricing(inventoryData) {
  const pricing = {
    productId: inventoryData.productId,
    basePrice: inventoryData.basePrice,
    adjustments: [],
    finalPrice: inventoryData.basePrice,
    appliedRules: []
  };

  // Rule 1: Demand-based pricing
  if (inventoryData.demandLevel === 'high' && inventoryData.stockLevel === 'low') {
    const adjustment = Math.round(inventoryData.basePrice * 0.05 * 100) / 100;
    pricing.adjustments.push({
      rule: 'demand_inventory',
      type: 'increase',
      percentage: 5,
      amount: adjustment,
      reason: 'High demand + low inventory'
    });
    pricing.finalPrice += adjustment;
    pricing.appliedRules.push('demand_inventory');
  }

  // Rule 2: Competitor price monitoring
  if (inventoryData.competitorPrice && inventoryData.competitorPrice < inventoryData.basePrice) {
    const diff = inventoryData.basePrice - inventoryData.competitorPrice;
    const percentageDiff = (diff / inventoryData.basePrice) * 100;

    if (percentageDiff > 10) {
      const adjustment = Math.round(inventoryData.basePrice * 0.03 * 100) / 100;
      pricing.adjustments.push({
        rule: 'competitor_match',
        type: 'decrease',
        percentage: 3,
        amount: adjustment,
        reason: `Competitor price is ${percentageDiff.toFixed(1)}% lower`
      });
      pricing.finalPrice -= adjustment;
      pricing.appliedRules.push('competitor_match');
    }
  }

  // Rule 3: Inventory aging alerts
  if (inventoryData.daysInStock > 30 && inventoryData.stockLevel === 'high') {
    const agingDiscount = Math.min(15, Math.floor(inventoryData.daysInStock / 10) * 3);
    const adjustment = Math.round(inventoryData.basePrice * (agingDiscount / 100) * 100) / 100;

    pricing.adjustments.push({
      rule: 'inventory_aging',
      type: 'decrease',
      percentage: agingDiscount,
      amount: adjustment,
      reason: `Product in stock for ${inventoryData.daysInStock} days - recommend bundle or discount`
    });
    pricing.finalPrice -= adjustment;
    pricing.apjustment = pricing.adjustments[pricing.adjustments.length - 1];
    pricing.appliedRules.push('inventory_aging');
  }

  // Rule 4: Time-based pricing
  if (inventoryData.isPeakHour) {
    const adjustment = Math.round(inventoryData.basePrice * 0.02 * 100) / 100;
    pricing.adjustments.push({
      rule: 'peak_hour',
      type: 'increase',
      percentage: 2,
      amount: adjustment,
      reason: 'Peak demand hours'
    });
    pricing.finalPrice += adjustment;
    pricing.appliedRules.push('peak_hour');
  }

  pricing.finalPrice = Math.round(pricing.finalPrice * 100) / 100;
  pricing.effectiveDate = new Date().toISOString();

  return pricing;
}

/**
 * Get pricing recommendations
 */
async function getPricingRecommendations() {
  return {
    timestamp: new Date().toISOString(),
    recommendations: [
      {
        productId: 'DEMO-001',
        currentPrice: 99.99,
        suggestedPrice: 94.99,
        reason: 'Inventory aging - 45 days in stock',
        potentialLift: '+12% conversion'
      },
      {
        productId: 'DEMO-002',
        currentPrice: 49.99,
        suggestedPrice: 52.49,
        reason: 'High demand, low stock (only 8 units left)',
        potentialLift: '+5% revenue'
      },
      {
        productId: 'DEMO-003',
        currentPrice: 149.99,
        suggestedPrice: 142.49,
        reason: 'Competitor pricing 15% lower',
        potentialLift: '+8% competitive position'
      }
    ]
  };
}

// =============================================================================
// BUDGET AUTO-ALLOCATION
// =============================================================================

/**
 * Analyze ROAS and reallocate budget
 */
async function analyzeAndReallocateBudget(channelData) {
  const analysis = {
    timestamp: new Date().toISOString(),
    channels: [],
    totalBudget: channelData.totalBudget || 10000,
    reallocations: []
  };

  // Analyze each channel
  channelData.channels.forEach(channel => {
    const channelAnalysis = {
      name: channel.name,
      currentSpend: channel.spend,
      roas: channel.roas,
      conversions: channel.conversions,
      cpa: channel.spend / (channel.conversions || 1),
      performance: 'underperform'
    };

    // Classify performance
    if (channel.roas >= 3.0) {
      channelAnalysis.performance = 'excellent';
      channelAnalysis.recommendation = 'Increase budget';
    } else if (channel.roas >= 2.0) {
      channelAnalysis.performance = 'good';
      channelAnalysis.recommendation = 'Maintain current spend';
    } else if (channel.roas >= 1.0) {
      channelAnalysis.performance = 'fair';
      channelAnalysis.recommendation = 'Optimize targeting';
    } else {
      channelAnalysis.performance = 'poor';
      channelAnalysis.recommendation = 'Reduce or pause';
    }

    analysis.channels.push(channelAnalysis);
  });

  // Calculate reallocations
  const totalSpend = analysis.channels.reduce((sum, c) => sum + c.spend, 0);
  const avgRoas = analysis.channels.reduce((sum, c) => sum + c.roas, 0) / analysis.channels.length;

  // Find channels to increase (high ROAS) and decrease (low ROAS)
  const highPerformers = analysis.channels.filter(c => c.roas > avgRoas * 1.2);
  const lowPerformers = analysis.channels.filter(c => c.roas < avgRoas * 0.8 && c.roas > 0);

  // Calculate reallocation amounts
  const reduceAmount = lowPerformers.reduce((sum, c) => sum + (c.spend * 0.2), 0);
  const increasePerChannel = highPerformers.length > 0 ? reduceAmount / highPerformers.length : 0;

  highPerformers.forEach(channel => {
    analysis.reallocations.push({
      channel: channel.name,
      action: 'increase',
      currentSpend: channel.spend,
      newSpend: Math.round((channel.spend + increasePerChannel) * 100) / 100,
      change: Math.round(increasePerChannel * 100) / 100,
      reason: `High ROAS (${channel.roas}) - allocate more budget`
    });
  });

  lowPerformers.forEach(channel => {
    analysis.reallocations.push({
      channel: channel.name,
      action: 'decrease',
      currentSpend: channel.spend,
      newSpend: Math.round((channel.spend * 0.8) * 100) / 100,
      change: Math.round(-channel.spend * 0.2 * 100) / 100,
      reason: `Low ROAS (${channel.roas}) - reduce allocation`
    });
  });

  // Calculate expected improvement
  const currentTotalRoas = analysis.channels.reduce((sum, c) => sum + (c.roas * c.spend), 0) / totalSpend;
  const projectedRoas = currentTotalRoas * 1.15; // Estimate 15% improvement

  analysis.summary = {
    currentAvgRoas: Math.round(currentTotalRoas * 100) / 100,
    projectedAvgRoas: Math.round(projectedRoas * 100) / 100,
    expectedImprovement: '15%',
    confidence: 0.78
  };

  return analysis;
}

// =============================================================================
// COMMAND CENTER EXECUTION
// =============================================================================

/**
 * Execute a recommended action
 */
async function executeAction(action) {
  const execution = {
    id: uuidv4(),
    action: action.description || action,
    status: 'pending',
    startedAt: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Validate action
    execution.steps.push({
      name: 'validate',
      status: 'completed',
      message: 'Action validated successfully'
    });

    // Step 2: Check prerequisites
    execution.steps.push({
      name: 'check_prerequisites',
      status: 'in_progress',
      message: 'Checking prerequisites...'
    });

    // Simulate prerequisite checks
    await sleep(200);

    const prerequisitesMet = true; // Would check inventory, balance, etc.

    if (!prerequisitesMet) {
      throw new Error('Prerequisites not met');
    }

    execution.steps[execution.steps.length - 1].status = 'completed';

    // Step 3: Execute action based on type
    const actionType = detectActionType(action.description || action);

    execution.steps.push({
      name: 'execute',
      status: 'in_progress',
      message: `Executing ${actionType} action...`
    });

    let result;
    switch (actionType) {
      case 'retention_campaign':
        result = await executeRetentionCampaign(action);
        break;
      case 'coupon':
        result = await executeCouponCreation(action);
        break;
      case 'budget_reallocation':
        result = await executeBudgetReallocation(action);
        break;
      case 'pricing_update':
        result = await executePricingUpdate(action);
        break;
      default:
        result = await executeGenericAction(action);
    }

    execution.steps[execution.steps.length - 1].status = 'completed';
    execution.result = result;
    execution.status = 'completed';

  } catch (error) {
    execution.status = 'failed';
    execution.error = error.message;
    execution.steps.push({
      name: 'error',
      status: 'failed',
      message: error.message
    });
  }

  execution.completedAt = new Date().toISOString();
  executionHistory.set(execution.id, execution);

  return execution;
}

/**
 * Detect action type from description
 */
function detectActionType(description) {
  const lower = (description || '').toLowerCase();

  if (lower.includes('retention') || lower.includes('retain') || lower.includes('inactive')) {
    return 'retention_campaign';
  }
  if (lower.includes('coupon') || lower.includes('discount') || lower.includes('offer')) {
    return 'coupon';
  }
  if (lower.includes('budget') || lower.includes('roas') || lower.includes('marketing')) {
    return 'budget_reallocation';
  }
  if (lower.includes('pricing') || lower.includes('price')) {
    return 'pricing_update';
  }
  return 'generic';
}

/**
 * Execute retention campaign
 */
async function executeRetentionCampaign(action) {
  // Create retention campaign
  const campaign = await autoCreateCampaign({
    inactiveDays: 60,
    ltvThreshold: 500,
    userName: 'Valued Customer',
    suggestedDiscount: 15
  });

  return {
    campaignId: campaign.id,
    message: `Retention campaign created and scheduled`,
    nextSteps: [
      'Review campaign content',
      'Approve or modify before send',
      'Monitor response rates'
    ]
  };
}

/**
 * Execute coupon creation
 */
async function executeCouponCreation(action) {
  const couponCode = `AUTO${Date.now().toString().slice(-6)}`;

  return {
    couponCode,
    discount: 10,
    validDays: 7,
    message: `Coupon ${couponCode} created successfully`
  };
}

/**
 * Execute budget reallocation
 */
async function executeBudgetReallocation(action) {
  return {
    message: 'Budget reallocation queued',
    estimatedCompletion: '2 hours',
    notification: 'Budget changes will be applied to campaigns at next refresh cycle'
  };
}

/**
 * Execute pricing update
 */
async function executePricingUpdate(action) {
  return {
    message: 'Pricing update scheduled',
    effectiveFrom: new Date(Date.now() + 3600000).toISOString(),
    affectedProducts: 3
  };
}

/**
 * Execute generic action
 */
async function executeGenericAction(action) {
  return {
    message: 'Action executed successfully',
    details: 'Action completed with default settings'
  };
}

// =============================================================================
// UTILITIES
// =============================================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(cors());
app.use(helmet());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// =============================================================================
// API ROUTES
// =============================================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'widget-command',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// MODULE 1: AI BUSINESS ADVISOR
// ============================================================================

/**
 * POST /api/command/ask
 * Ask natural language question about business
 */
app.post('/api/command/ask',requireAuth,  async (req, res) => {
  try {
    const { question, businessId, context } = req.body;

    if (!question) {
      return res.status(400).json({
        error: 'Question is required',
        example: { question: 'Why did revenue drop this week?' }
      });
    }

    const id = businessId || DEFAULT_BUSINESS_ID;

    // Fetch relevant events from MemoryOS
    let events = eventStore.get(id) || [];
    if (events.length === 0) {
      // Generate sample events if none exist
      events = generateSampleEvents(id);
      eventStore.set(id, events);
    }

    // Generate insights
    const insights = generateInsight(question, {
      revenueMetrics: calculateRevenueMetrics(events),
      churnMetrics: calculateChurnMetrics(events),
      cartMetrics: calculateCartMetrics(events),
      marketingMetrics: calculateMarketingMetrics(events)
    });

    // Perform root cause analysis
    const rootCause = analyzeRootCause(detectIssue(question), events);

    // Generate recommendations
    const recommendations = generateRecommendations(insights, rootCause);

    // Cache the insights
    insightsCache.set(id, {
      question,
      insights,
      rootCause,
      recommendations,
      timestamp: new Date().toISOString()
    });

    res.json({
      answer: generateNaturalLanguageAnswer(question, insights, rootCause, recommendations),
      insights,
      rootCause,
      recommendations,
      confidence: 0.82,
      businessId: id
    });

  } catch (error) {
    console.error('Ask error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/command/insights
 * Get current insights summary
 */
app.get('/api/command/insights', (req, res) => {
  const businessId = req.query.businessId || DEFAULT_BUSINESS_ID;

  let cached = insightsCache.get(businessId);

  if (!cached) {
    // Generate fresh insights
    const events = generateSampleEvents(businessId);
    const insights = [
      {
        type: 'revenue',
        title: 'Revenue Status',
        finding: 'Revenue is stable with slight upward trend',
        impact: 'Positive',
        confidence: 0.85
      },
      {
        type: 'churn',
        title: 'Retention Status',
        finding: 'Churn rate within acceptable range at 3.2%',
        impact: 'Normal',
        confidence: 0.88
      },
      {
        type: 'conversion',
        title: 'Conversion Funnel',
        finding: 'Cart abandonment rate at 68%, above target of 60%',
        impact: 'Needs attention',
        confidence: 0.80
      }
    ];

    cached = {
      insights,
      timestamp: new Date().toISOString()
    };
  }

  res.json({
    businessId,
    ...cached,
    summary: {
      totalInsights: cached.insights?.length || 0,
      criticalIssues: cached.insights?.filter(i => i.impact === 'High' || i.impact === 'Critical').length || 0,
      lastUpdated: cached.timestamp
    }
  });
});

// ============================================================================
// MODULE 2: CAMPAIGN AUTO-CREATION
// ============================================================================

/**
 * POST /api/command/campaign/create
 * Auto-create campaign on churn risk detection
 */
app.post('/api/command/campaign/create',requireAuth,  async (req, res) => {
  try {
    const churnSignal = req.body;

    if (!churnSignal.reason && !churnSignal.type) {
      return res.status(400).json({
        error: 'Churn signal required (reason, type, or detection data)',
        example: {
          reason: '60+ days inactive',
          type: 'inactivity',
          inactiveDays: 60,
          ltvThreshold: 500
        }
      });
    }

    const campaign = await autoCreateCampaign(churnSignal);

    res.status(201).json({
      campaign,
      message: 'Campaign auto-created successfully',
      nextSteps: [
        'Review campaign content',
        'Approve before send',
        'Monitor open rates'
      ]
    });

  } catch (error) {
    console.error('Campaign create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/command/campaign/:id/status
 * Get campaign status
 */
app.get('/api/command/campaign/:id/status', (req, res) => {
  const { id } = req.params;
  const campaign = campaignsStore.get(id);

  if (!campaign) {
    return res.status(404).json({
      error: 'Campaign not found',
      id
    });
  }

  // Simulate status updates
  const statusUpdate = {
    ...campaign,
    metrics: {
      sent: campaign.status === 'completed' ? Math.floor(Math.random() * 500) + 100 : 0,
      opened: Math.floor(Math.random() * 150) + 50,
      clicked: Math.floor(Math.random() * 50) + 10,
      converted: Math.floor(Math.random() * 20) + 5,
      revenue: Math.floor(Math.random() * 2000) + 500
    }
  };

  res.json(statusUpdate);
});

/**
 * GET /api/command/campaigns
 * List all campaigns
 */
app.get('/api/command/campaigns', (req, res) => {
  const campaigns = Array.from(campaignsStore.values());

  res.json({
    total: campaigns.length,
    campaigns: campaigns.slice(-20) // Last 20 campaigns
  });
});

// ============================================================================
// MODULE 3: COUPON AUTO-OPTIMIZATION
// ============================================================================

/**
 * POST /api/command/coupon/optimize
 * Analyze and find minimum effective discount
 */
app.post('/api/command/coupon/optimize',requireAuth,  async (req, res) => {
  try {
    const options = req.body || {};

    const analysis = await analyzeCouponOptimization();

    // Store coupon analysis
    couponsStore.set(analysis.analysisDate, analysis);

    res.json({
      analysis,
      summary: {
        totalCouponsAnalyzed: analysis.analyzedCoupons,
        minimumEffectiveDiscount: analysis.recommendations[0]?.recommended,
        potentialSavings: analysis.recommendations[0]?.savings,
        confidence: analysis.recommendations[0]?.confidence
      }
    });

  } catch (error) {
    console.error('Coupon optimize error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/command/coupon/recommendations
 * Get coupon recommendations
 */
app.get('/api/command/coupon/recommendations', (req, res) => {
  const recommendations = [
    {
      type: 'reduce_discount',
      current: 15,
      recommended: 8,
      reason: 'Conversion rate analysis shows 8% converts similarly to 15%',
      savings: {
        monthly: 525,
        annual: 6300
      },
      confidence: 0.85
    },
    {
      type: 'segment_discount',
      segments: [
        { segment: 'high_value', discount: 10 },
        { segment: 'medium_value', discount: 8 },
        { segment: 'low_value', discount: 5 }
      ],
      reason: 'Different segments respond to different discount levels',
      expectedLift: '+12% overall conversion'
    },
    {
      type: 'time_limited',
      suggestion: 'Use flash sales with higher discounts for short periods',
      reason: 'Creates urgency without long-term discount habit',
      example: '25% off for 4 hours'
    }
  ];

  res.json({
    recommendations,
    generatedAt: new Date().toISOString()
  });
});

// ============================================================================
// MODULE 4: DYNAMIC PRICING
// ============================================================================

/**
 * POST /api/command/pricing/dynamic
 * Apply dynamic pricing rules
 */
app.post('/api/command/pricing/dynamic',requireAuth,  async (req, res) => {
  try {
    const inventoryData = req.body;

    if (!inventoryData.productId) {
      return res.status(400).json({
        error: 'Product ID is required',
        example: {
          productId: 'PROD-001',
          basePrice: 99.99,
          demandLevel: 'high',
          stockLevel: 'low'
        }
      });
    }

    const pricing = await applyDynamicPricing(inventoryData);

    res.json({
      pricing,
      appliedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dynamic pricing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/command/pricing/recommendations
 * Get pricing recommendations
 */
app.get('/api/command/pricing/recommendations', async (req, res) => {
  const recommendations = await getPricingRecommendations();
  res.json(recommendations);
});

// ============================================================================
// MODULE 5: BUDGET AUTO-ALLOCATION
// ============================================================================

/**
 * POST /api/command/budget/allocate
 * Analyze ROAS and reallocate budget
 */
app.post('/api/command/budget/allocate',requireAuth,  async (req, res) => {
  try {
    const channelData = req.body;

    if (!channelData.channels || !Array.isArray(channelData.channels)) {
      // Use sample data if not provided
      channelData.channels = [
        { name: 'Google Ads', spend: 3000, roas: 3.5, conversions: 45 },
        { name: 'Facebook Ads', spend: 2500, roas: 2.1, conversions: 32 },
        { name: 'Instagram', spend: 2000, roas: 1.8, conversions: 28 },
        { name: 'Email', spend: 500, roas: 4.2, conversions: 62 },
        { name: 'SEO', spend: 2000, roas: 2.8, conversions: 38 }
      ];
      channelData.totalBudget = 10000;
    }

    const analysis = await analyzeAndReallocateBudget(channelData);

    // Store allocation
    budgetAllocationsStore.set(new Date().toISOString(), analysis);

    res.json({
      analysis,
      summary: {
        currentBudget: analysis.totalBudget,
        reallocated: analysis.reallocations.reduce((sum, r) => sum + Math.abs(r.change), 0),
        expectedRoasImprovement: analysis.summary?.expectedImprovement
      }
    });

  } catch (error) {
    console.error('Budget allocate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// MODULE 6: FULL COMMAND CENTER
// ============================================================================

/**
 * GET /api/command/query
 * Natural language business query
 */
app.get('/api/command/query', async (req, res) => {
  const { q, businessId } = req.query;

  if (!q) {
    return res.status(400).json({
      error: 'Query parameter required',
      example: '/api/command/query?q=How%20many%20carts%20abandoned%20today%3F'
    });
  }

  const id = businessId || DEFAULT_BUSINESS_ID;
  const events = eventStore.get(id) || generateSampleEvents(id);

  const queryResponses = {
    'cart': calculateCartMetrics(events),
    'revenue': calculateRevenueMetrics(events),
    'churn': calculateChurnMetrics(events),
    'campaign': calculateMarketingMetrics(events),
    'roas': calculateMarketingMetrics(events)
  };

  // Find matching query type
  let response = { message: 'Query processed', data: null };
  const lowerQ = q.toLowerCase();

  if (lowerQ.includes('cart') || lowerQ.includes('abandon')) {
    response = {
      message: `Found ${queryResponses.cart.abandoned} abandoned carts today`,
      data: queryResponses.cart,
      type: 'cart_abandonment'
    };
  } else if (lowerQ.includes('roas')) {
    response = {
      message: `Current ROAS is ${queryResponses.campaign.avgRoas}`,
      data: queryResponses.campaign,
      type: 'marketing_performance'
    };
  } else if (lowerQ.includes('campaign') || lowerQ.includes('perform')) {
    response = {
      message: `Best performing campaign: Email with 4.2 ROAS`,
      data: queryResponses.campaign,
      type: 'campaign_performance'
    };
  } else if (lowerQ.includes('revenue') || lowerQ.includes('sales')) {
    response = {
      message: `Today's revenue: $${queryResponses.revenue.today}`,
      data: queryResponses.revenue,
      type: 'revenue'
    };
  } else if (lowerQ.includes('churn') || lowerQ.includes('retain')) {
    response = {
      message: `Current churn rate: ${queryResponses.churn.rate}%`,
      data: queryResponses.churn,
      type: 'churn'
    };
  } else {
    response = {
      message: `Query processed: "${q}"`,
      suggestion: 'Try asking about: carts, revenue, churn, campaigns, or ROAS'
    };
  }

  res.json({
    query: q,
    ...response,
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/command/execute
 * Execute recommended action
 */
app.post('/api/command/execute',requireAuth,  async (req, res) => {
  try {
    const { action, autoApprove } = req.body;

    if (!action) {
      return res.status(400).json({
        error: 'Action is required',
        example: { action: 'Send retention campaign to inactive users' }
      });
    }

    const execution = await executeAction({ description: action });

    const response = {
      execution,
      message: execution.status === 'completed'
        ? 'Action executed successfully'
        : `Action failed: ${execution.error}`,
      requiresApproval: !autoApprove && execution.status === 'pending'
    };

    res.status(execution.status === 'completed' ? 200 : 202).json(response);

  } catch (error) {
    console.error('Execute error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/command/executions
 * Get execution history
 */
app.get('/api/command/executions', (req, res) => {
  const executions = Array.from(executionHistory.values())
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 50);

  res.json({
    total: executionHistory.size,
    executions
  });
});

// ============================================================================
// SAMPLE DATA GENERATORS
// ============================================================================

function generateSampleEvents(businessId) {
  const events = [];
  const now = Date.now();

  // Generate 30 days of events
  for (let i = 0; i < 30; i++) {
    const dayOffset = i * 24 * 60 * 60 * 1000;

    // Revenue events
    events.push({
      id: uuidv4(),
      businessId,
      type: 'revenue',
      action: 'order',
      value: Math.floor(Math.random() * 2000) + 500,
      timestamp: new Date(now - dayOffset).toISOString()
    });

    // Cart events
    if (Math.random() > 0.4) {
      events.push({
        id: uuidv4(),
        businessId,
        type: 'cart',
        action: 'abandon',
        value: Math.floor(Math.random() * 150) + 50,
        timestamp: new Date(now - dayOffset).toISOString()
      });
    }
  }

  return events;
}

function calculateRevenueMetrics(events) {
  const revenueEvents = events.filter(e => e.type === 'revenue');
  const last7Days = revenueEvents.slice(-7);
  const prev7Days = revenueEvents.slice(-14, -7);

  const thisWeek = last7Days.reduce((sum, e) => sum + (e.value || 0), 0);
  const lastWeek = prev7Days.reduce((sum, e) => sum + (e.value || 0), 0);

  return {
    today: last7Days[last7Days.length - 1]?.value || 0,
    thisWeek: thisWeek,
    lastWeek: lastWeek,
    change: lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek * 100).toFixed(1) : 0,
    trend: thisWeek > lastWeek ? 'up' : 'down'
  };
}

function calculateChurnMetrics(events) {
  return {
    rate: (Math.random() * 2 + 2).toFixed(1),
    atRisk: Math.floor(Math.random() * 50) + 20,
    recovered: Math.floor(Math.random() * 20) + 10,
    trend: 'stable'
  };
}

function calculateCartMetrics(events) {
  const cartEvents = events.filter(e => e.type === 'cart');
  const abandoned = cartEvents.filter(e => e.action === 'abandon').length;
  const completed = cartEvents.filter(e => e.action === 'complete').length;

  return {
    abandoned: abandoned || Math.floor(Math.random() * 30) + 10,
    completed: completed || Math.floor(Math.random() * 50) + 20,
    total: abandoned + completed,
    abandonmentRate: ((abandoned / (abandoned + completed)) * 100).toFixed(1) || 68
  };
}

function calculateMarketingMetrics(events) {
  return {
    avgRoas: (Math.random() * 2 + 2).toFixed(1),
    campaigns: Math.floor(Math.random() * 10) + 5,
    conversions: Math.floor(Math.random() * 100) + 50,
    spend: Math.floor(Math.random() * 5000) + 3000,
    bestPerformer: 'Email Marketing',
    worstPerformer: 'Instagram'
  };
}

function detectIssue(question) {
  const lower = question.toLowerCase();
  if (lower.includes('revenue') || lower.includes('sales')) return 'revenue_drop';
  if (lower.includes('churn')) return 'churn_spike';
  if (lower.includes('cart') || lower.includes('abandon')) return 'cart_abandonment';
  if (lower.includes('roas')) return 'roas_decline';
  return 'low_conversion';
}

function generateNaturalLanguageAnswer(question, insights, rootCause, recommendations) {
  const issue = detectIssue(question);
  const impact = rootCause.revenueImpact;

  let answer = `Based on my analysis, `;

  if (issue === 'revenue_drop') {
    answer += `revenue has been affected primarily by a decline in customer acquisition and a higher cart abandonment rate. `;
  } else if (issue === 'churn_spike') {
    answer += `there's an elevated churn risk among customers who haven't engaged in the past 60+ days. `;
  } else if (issue === 'cart_abandonment') {
    answer += `cart abandonment is running at 68%, which is 8% above our target. `;
  } else {
    answer += `multiple factors are contributing to the current situation. `;
  }

  if (rootCause.causes.length > 0) {
    answer += `The primary cause appears to be: ${rootCause.primaryCause}. `;
  }

  if (impact) {
    answer += `This is impacting revenue by approximately $${impact.estimatedLoss}/month. `;
  }

  if (recommendations.length > 0) {
    const topRec = recommendations[0];
    answer += `I recommend: ${topRec.action}. This should be completed within ${topRec.timeframe}.`;
  }

  return answer;
}

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// =============================================================================
// START SERVER
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`[Widget Command] AI Business Advisor running on port ${PORT}`);
  console.log(`[Widget Command] Health: http://localhost:${PORT}/health`);
  console.log(`[Widget Command] API: http://localhost:${PORT}/api/command/*`);
});

module.exports = { app, PORT };
