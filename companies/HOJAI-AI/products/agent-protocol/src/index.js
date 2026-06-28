/**
 * Agent Protocol (ACP)
 * Port: 5469
 * ACP protocol handlers for merchant agents
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.AGENT_PROTOCOL_PORT || 5469;

const NEXHA_ACP = process.env.NEXHA_ACP_URL || 'http://localhost:4340';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'agent-protocol', port: PORT });
});

// POST /api/agent/query - Handle agent query
app.post('/api/agent/query',requireAuth,  async (req, res) => {
  try {
    const { agentType, query, context } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });

    // Route to Nexha ACP
    try {
      const ar = await axios.post(`${NEXHA_ACP}/api/acp/query`, { agentType, query, context }, {
        headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
        timeout: 15000
      });
      res.json({ success: true, data: ar.data });
    } catch (e) {
      // Fallback response
      res.json({ success: true, data: { response: 'Query received', agentType, query } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agent/negotiate - Start negotiation
app.post('/api/agent/negotiate',requireAuth,  async (req, res) => {
  try {
    const { buyerAgent, sellerAgent, product, initialOffer } = req.body;
    res.json({
      success: true, data: {
        negotiationId: `neg_${Date.now()}`,
        status: 'initiated',
        buyerAgent, sellerAgent, product, initialOffer
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/agent/contract - Generate contract
app.post('/api/agent/contract',requireAuth,  async (req, res) => {
  try {
    const { terms, parties } = req.body;
    res.json({
      success: true, data: {
        contractId: `contract_${Date.now()}`,
        status: 'draft', terms, parties,
        createdAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Agent Protocol running on port ${PORT}`));
module.exports = app;
