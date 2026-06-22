/**
 * Renewal Agent - Expert Employee
 * Port: 4774
 */

const express = require('express');
const app = express();
app.use(express.json({ limit: "10kb" }));

const PORT = 4774;

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'renewal-agent', port: PORT });
});

// Check Renewal
app.post('/api/renewals/check', (req, res) => {
  const { customerId, contractEnd } = req.body;
  const daysToExpiry = Math.floor(Math.random() * 60);
  res.json({
    customerId,
    contractEnd,
    daysToExpiry,
    renewalRisk: daysToExpiry < 30 ? 'high' : daysToExpiry < 60 ? 'medium' : 'low',
    recommendedAction: daysToExpiry < 30 ? 'immediate_renewal_drive' : 'start_conversation'
  });
});

// Generate Renewal Offer
app.post('/api/renewals/offer', (req, res) => {
  const { customerId, currentValue } = req.body;
  res.json({
    customerId,
    currentValue,
    renewalOptions: [
      { term: '1 year', discount: '10%', incentive: 'Free upgrade' },
      { term: '2 years', discount: '20%', incentive: 'Priority support' }
    ],
    recommended: '2 years with 20% discount'
  });
});

// Process Renewal
app.post('/api/renewals/process', (req, res) => {
  const { customerId, selectedPlan } = req.body;
  res.json({
    renewalId: `rnw_${Date.now()}`,
    customerId,
    plan: selectedPlan,
    status: 'renewed',
    newContractEnd: '2027-06-01'
  });
});

app.listen(PORT, () => {
  console.log(`Renewal Agent running on port ${PORT}`);
});
