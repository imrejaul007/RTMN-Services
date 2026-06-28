/**
 * Agent Reputation
 * Port: 5471
 * Trust scores for merchant agents
 */
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.AGENT_REPUTATION_PORT || 5471;

const NEXHA_REPUTATION = process.env.NEXHA_REPUTATION_URL || 'http://localhost:4271';

app.use(express.json());

const reputations = new Map(); // agentId -> reputation

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-reputation', agents: reputations.size, port: PORT });
});

// GET /api/reputation/:agentId - Get agent reputation
app.get('/api/reputation/:agentId', async (req, res) => {
  try {
    let rep = reputations.get(req.params.agentId);
    if (!rep) {
      try {
        const rr = await axios.get(`${NEXHA_REPUTATION}/api/reputation/${req.params.agentId}`, { timeout: 3000 });
        rep = rr.data;
      } catch (e) {
        rep = { agentId: req.params.agentId, score: 75, transactions: 0 };
      }
    }
    res.json({ success: true, data: rep });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/reputation/:agentId/update - Update reputation
app.post('/api/reputation/:agentId/update', (req, res) => {
  const { score, transactionCount, fulfillmentRate, responseTime } = req.body;
  const existing = reputations.get(req.params.agentId) || { agentId: req.params.agentId, score: 75 };
  const updated = {
    ...existing,
    score: score ?? existing.score,
    transactionCount: transactionCount ?? existing.transactionCount ?? 0,
    fulfillmentRate: fulfillmentRate ?? existing.fulfillmentRate ?? 0.95,
    responseTime: responseTime ?? existing.responseTime ?? 0,
    updatedAt: new Date().toISOString()
  };
  reputations.set(req.params.agentId, updated);
  res.json({ success: true, data: updated });
});

app.listen(PORT, () => console.log(`Agent Reputation running on port ${PORT}`));
module.exports = app;
