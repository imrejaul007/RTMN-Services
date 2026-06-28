/**
 * HOJAI Support Intelligence Service
 *
 * Profiles customer support behavior and recommends handling.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4900
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 4900;
const SERVICE_NAME = 'support-intelligence';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

function calculateSupportProfile(data) {
  const { ticketHistory, refundRequests, sentiment, channelHistory } = data;

  const tickets90d = ticketHistory?.last90d || 0;
  const refundRate = refundRequests && refundRequests.total > 0
    ? refundRequests.denied / refundRequests.total
    : 0;

  let escalationProb = 0.1;
  if (ticketHistory?.escalations > 0) {
    escalationProb += Math.min(ticketHistory.escalations * 0.1, 0.3);
  }
  if (sentiment === 'negative') escalationProb += 0.2;
  if (tickets90d > 5) escalationProb += 0.1;
  escalationProb = Math.min(escalationProb, 1);

  let priority = 'normal';
  if (escalationProb > 0.5 || tickets90d > 10) priority = 'high';
  else if (escalationProb < 0.2 && tickets90d <= 2) priority = 'low';

  let tone = 'friendly';
  if (sentiment === 'negative') tone = 'empathetic';
  else if (sentiment === 'positive') tone = 'friendly';
  else tone = 'formal';

  let channel = 'whatsapp';
  if (channelHistory) {
    const channels = Object.entries(channelHistory).sort((a, b) => b[1] - a[1]);
    if (channels.length > 0) channel = channels[0][0];
  }

  let agent = 'ai';
  if (escalationProb > 0.5 || refundRate > 0.3) agent = 'human';
  if (tickets90d > 10) agent = 'specialist';

  let resolution = 'apology';
  if (refundRate > 0.3) resolution = 'refund';
  else if (escalationProb > 0.5) resolution = 'escalate';
  else if (sentiment === 'positive') resolution = 'thank_you';

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

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/support/profile', (req, res) => {
  try {
    const result = calculateSupportProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/support/history/:customerId', (req, res) => {
  res.json({ customerId: req.params.customerId, tickets: [] });
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Support Intelligence Service listening on port ${PORT}`));
}

module.exports = app;
