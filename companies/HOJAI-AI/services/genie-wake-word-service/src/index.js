/**
 * Genie Wake Word Service
 * Detects "Hey Genie" and "हे जिनी" wake words
 * Port: 4767
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4767;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Wake word configurations
const WAKE_WORDS = {
  english: {
    phrases: ['hey genie', 'hi genie', 'ok genie', 'hey genie!'],
    sensitivity: 0.75
  },
  hindi: {
    phrases: ['हे जिनी', 'अरे जिनी', 'भाई जिनी'],
    sensitivity: 0.70
  }
};

const clients = new Map();
const detections = [];

// WebSocket server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  const clientId = uuidv4().slice(0, 8);
  clients.set(clientId, { ws, detections: 0 });
  ws.send(JSON.stringify({ type: 'connected', clientId }));
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'wake-word', port: PORT });
});

app.get('/api/detections', (req, res) => {
  res.json({ detections: detections.slice(-100), total: detections.length });
});

app.get('/api/statistics', (req, res) => {
  res.json({
    totalDetections: detections.length,
    activeClients: clients.size,
    lastDetection: detections[detections.length - 1]
  });
});

app.post('/api/listen/start', (req, res) => {
  res.json({ success: true, listening: true });
});

app.post('/api/listen/stop', (req, res) => {
  res.json({ success: true, listening: false });
});

app.listen(PORT, () => {
  console.log(`🎤 Wake Word Service running on port ${PORT}`);
});

module.exports = app;
