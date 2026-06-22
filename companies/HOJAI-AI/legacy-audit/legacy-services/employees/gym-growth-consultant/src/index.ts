/**
 * Gym Growth Consultant - Expert Employee
 * Port: 4763
 */

import express from 'express';

const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4763;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'gym-growth-consultant', port: PORT });
});

// Member Churn Prediction
app.post('/api/consult/churn', (req, res) => {
  const { memberId, attendance, payments, engagement } = req.body;

  // Mock churn prediction
  const churnRisk = Math.random();
  const riskLevel = churnRisk > 0.7 ? 'high' : churnRisk > 0.4 ? 'medium' : 'low';

  res.json({
    memberId,
    churnRisk: churnRisk.toFixed(2),
    riskLevel,
    factors: [
      { name: 'attendance_drop', impact: -0.3 },
      { name: 'payment_delay', impact: -0.2 },
      { name: 'engagement_score', impact: 0.25 }
    ],
    recommendations: [
      'Offer personal training session',
      'Create renewal incentive',
      'Schedule wellness call'
    ]
  });
});

// PT Sales Recommendations
app.post('/api/consult/pt-sales', (req, res) => {
  const { memberId, goals, attendance } = req.body;

  res.json({
    memberId,
    ptOpportunities: [
      { type: 'personal_training', score: 0.85, reason: 'High engagement, looking to progress' },
      { type: 'nutrition_coaching', score: 0.72, reason: 'Weight loss goal detected' },
      { type: 'small_group', score: 0.68, reason: 'Social preference' }
    ],
    recommendedPackage: {
      name: 'PT Starter Pack',
      sessions: 12,
      price: 12000,
      conversionLikelihood: 0.78
    }
  });
});

// Membership Upgrades
app.post('/api/consult/upgrades', (req, res) => {
  const { memberId, currentPlan, tenure } = req.body;

  res.json({
    memberId,
    upgradePath: [
      { from: 'basic', to: 'premium', score: 0.82, incentive: '20% off annual' },
      { from: 'premium', to: 'elite', score: 0.65, incentive: 'Unlimited classes' }
    ],
    projectedRevenue: {
      monthly: 4500,
      annual: 54000
    }
  });
});

// Attendance Optimization
app.post('/api/consult/attendance', (req, res) => {
  const { memberId, classHistory, preferences } = req.body;

  res.json({
    memberId,
    optimalTimes: ['6AM Mon-Wed', '7PM Fri'],
    classSuggestions: ['HIIT', 'Yoga', 'Strength Training'],
    reminderSchedule: '2 hours before preferred class',
    projectedVisits: 4.2
  });
});

// Growth Recommendations
app.get('/api/consult/growth', (req, res) => {
  res.json({
    recommendations: [
      { area: 'churn_prevention', priority: 'high', impact: 'retain 15% more members' },
      { area: 'pt_conversion', priority: 'high', impact: '₹2.5L additional monthly' },
      { area: 'upgrade_path', priority: 'medium', impact: '₹50K additional monthly' }
    ],
    kpis: {
      currentMembers: 450,
      monthlyChurnRate: '8%',
      ptConversionRate: '12%',
      avgLifetimeValue: '₹35000'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Gym Growth Consultant running on port ${PORT}`);
});
