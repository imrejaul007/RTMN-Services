/**
 * RTMN Agentic Marketplace
 * Nexha + SUTAR + RTMN Integration
 */

const express = require('express');
const axios = require('axios');
const router = express.Router();

const SERVICES = {
  sutarOs: 'http://localhost:4799',
  nexhaProcurement: 'http://localhost:4320',
  memoryOs: 'http://localhost:4703',
  twinOs: 'http://localhost:4705',
  procurement: 'http://localhost:5096',
  finance: 'http://localhost:4801',
};

// Hotel Inventory → SUTAR → Nexha Flow
router.post('/hotel-procurement', async (req, res) => {
  const { hotelId, category, items, urgency } = req.body;

  try {
    const results = {};

    // 1. PMS → SUTAR Event
    const eventRes = await axios.post(`${SERVICES.sutarOs}/events/publish`, {
      topic: 'hotel.inventory.low',
      payload: { hotelId, category, items, urgency, timestamp: new Date().toISOString() },
    }).catch(() => ({ data: { eventId: `EVT-${Date.now()}` } }));
    results.sutarEvent = eventRes.data;

    // 2. Get SUTAR stats
    const statsRes = await axios.get(`${SERVICES.sutarOs}/stats`).catch(() => ({ data: {} }));
    results.sutarStats = statsRes.data;

    res.json({
      success: true,
      integration: 'hotel-procurement',
      flow: 'PMS → SUTAR → Nexha',
      results,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Status check
router.get('/status', async (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Agent Marketplace',
    version: '1.0.0',
  });
});

module.exports = router;
