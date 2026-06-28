/**
 * HOJAI Trust Score Service
 *
 * Calculates customer trust scores for commerce.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4897
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4897;
const SERVICE_NAME = 'trust-score-service';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const trustHistory = new Map();

function calculateTrustScore(data) {
  const { customerId, orderHistory, supportHistory, accountAge, paymentHistory } = data;

  let score = 50;
  const factors = [];

  // Order completion rate (30% weight)
  if (orderHistory) {
    const { total, completed, cancelled, returned } = orderHistory;
    const completionRate = total > 0 ? completed / total : 0.5;
    score += completionRate * 30 - 15;
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
    score += -returnRate * 20;
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
    score += -ticketRate * 15;
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
    score += ageFactor * 15 - 7.5;
    factors.push({
      name: 'account_age',
      contribution: ageFactor - 0.5,
      value: `${accountAge} days`,
      description: 'Account tenure'
    });
  }

  // Payment history (20% weight)
  if (paymentHistory) {
    const { successful, failed } = paymentHistory;
    const paymentSuccessRate = successful + failed > 0
      ? successful / (successful + failed)
      : 0.5;
    score += paymentSuccessRate * 20 - 10;
    factors.push({
      name: 'payment_history',
      contribution: paymentSuccessRate - 0.5,
      value: `${Math.round(paymentSuccessRate * 100)}% success`,
      description: 'Payment success rate'
    });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level = 'low';
  if (score >= 80) level = 'trusted';
  else if (score >= 60) level = 'high';
  else if (score >= 40) level = 'medium';

  let badge = 'new';
  if (score >= 90) badge = 'vip';
  else if (score >= 75) badge = 'trusted';
  else if (score >= 50) badge = 'verified';
  else if (accountAge && accountAge > 30) badge = 'verified';

  if (customerId) {
    trustHistory.set(customerId, { score, level, badge, factors });
  }

  return {
    score,
    level,
    badge,
    factors,
    calculated_at: new Date().toISOString()
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/trust/score', (req, res) => {
  try {
    const result = calculateTrustScore(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/trust/history/:customerId', (req, res) => {
  const history = trustHistory.get(req.params.customerId);
  if (!history) return res.status(404).json({ error: 'Not found' });
  res.json(history);
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Trust Score Service listening on port ${PORT}`));
}

module.exports = app;
