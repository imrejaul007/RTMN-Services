/**
 * Genie Listening Modes Service
 * Manages Manual, Continuous, Passive, Smart modes
 * Port: 4768
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4768;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const MODES = {
  manual: { name: 'Manual', description: 'Tap-to-talk', battery: 'none' },
  continuous: { name: 'Continuous', description: 'Always listening', battery: 'high' },
  passive: { name: 'Passive', description: 'Ambient context', battery: 'low' },
  smart: { name: 'Smart', description: 'Adaptive mode', battery: 'medium' }
};

const history = [];

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'listening-modes', port: PORT });
});

app.get('/api/modes', (req, res) => {
  res.json({ modes: MODES });
});

app.post('/api/modes/switch', (req, res) => {
  const { mode, clientId } = req.body;
  if (!MODES[mode]) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  history.push({ mode, clientId, timestamp: new Date().toISOString() });
  res.json({ success: true, mode });
});

app.get('/api/recommend', (req, res) => {
  const { deviceType } = req.query;
  const recommendations = {
    smartphone: 'smart',
    smartwatch: 'passive',
    earbuds: 'continuous',
    car: 'continuous',
    laptop: 'smart',
    desktop: 'manual'
  };
  res.json({ recommended: recommendations[deviceType] || 'manual' });
});

app.listen(PORT, () => {
  console.log(`🎚️ Listening Modes Service running on port ${PORT}`);
});

module.exports = app;
