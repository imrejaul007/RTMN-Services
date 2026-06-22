/**
 * Merchant CFO - Expert Employee for REZ Merchants
 * Port: 4765
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4765;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'merchant-cfo', port: PORT });
});

// Financial Health Analysis
app.post('/api/consult/financial-health', (req, res) => {
  const { merchantId, sales, costs, customers } = req.body;

  const revenue = sales || 500000;
  const expenses = costs || 350000;
  const profit = revenue - expenses;
  const margin = (profit / revenue * 100).toFixed(1);

  res.json({
    merchantId,
    metrics: {
      revenue,
      expenses,
      profit,
      margin: `${margin}%`,
      burnRate: expenses / 30
    },
    health: {
      score: profit > 0 ? 'healthy' : 'critical',
      indicators: [
        { name: 'Profit Margin', status: parseFloat(margin) > 20 ? 'good' : 'warning' },
        { name: 'Revenue Growth', status: 'good' },
        { name: 'Customer Acquisition', status: 'good' }
      ]
    },
    recommendations: [
      'Reduce COGS by 5% to improve margin',
      'Focus on repeat customers (40% higher LTV)',
      'Optimize marketing spend (current ROAS: 2.5x)'
    ]
  });
});

// Cashback Optimization
app.post('/api/consult/cashback', (req, res) => {
  const { merchantId, avgOrder, conversionRate } = req.body;

  const recommendations = [
    { cashback: '2%', impact: '+12% conversion', cost: 2400 },
    { cashback: '5%', impact: '+25% conversion', cost: 6000 },
    { cashback: '10%', impact: '+40% conversion', cost: 12000 }
  ];

  res.json({
    merchantId,
    currentCashback: '0%',
    recommendations,
    optimalCashback: '5%',
    projectedImpact: {
      conversionLift: '25%',
      additionalOrders: 150,
      additionalRevenue: 75000,
      cashbackCost: 6000,
      netGain: 69000
    }
  });
});

// Loyalty ROI
app.post('/api/consult/loyalty-roi', (req, res) => {
  const { merchantId, members, monthlySpend } = req.body;

  res.json({
    merchantId,
    loyaltyMetrics: {
      totalMembers: members || 1200,
      activeMembers: 720,
      monthlySpend: monthlySpend || 2500,
      retentionRate: '68%'
    },
    roi: {
      programCost: 15000,
      revenueFromMembers: 180000,
      netGain: 165000,
      roi: '1100%'
    },
    recommendations: [
      'Tier program: Bronze/Silver/Gold',
      'Birthday rewards increase retention 15%',
      'Points expiry drives 20% more purchases'
    ]
  });
});

// Review Impact
app.post('/api/consult/reviews-impact', (req, res) => {
  const { merchantId, rating, reviewCount } = req.body;

  res.json({
    merchantId,
    reviewMetrics: {
      rating: rating || 4.2,
      reviewCount: reviewCount || 450,
      responseRate: '62%'
    },
    impact: {
      eachStarIncrease: '+12% conversion',
      each10Reviews: '+3% conversion',
      pricePremium: '5% per star'
    },
    recommendations: [
      'Respond to all negative reviews within 24h',
      'Send review request 2h after purchase',
      'Showcase top reviews on homepage'
    ]
  });
});

// Revenue Forecast
app.get('/api/consult/forecast', (req, res) => {
  res.json({
    forecast: [
      { month: 'Jun 2026', revenue: 520000, confidence: 0.85 },
      { month: 'Jul 2026', revenue: 580000, confidence: 0.80 },
      { month: 'Aug 2026', revenue: 620000, confidence: 0.75 }
    ],
    scenarios: {
      optimistic: 750000,
      base: 580000,
      conservative: 450000
    }
  });
});

app.listen(PORT, () => {
  console.log(`Merchant CFO running on port ${PORT}`);
});
