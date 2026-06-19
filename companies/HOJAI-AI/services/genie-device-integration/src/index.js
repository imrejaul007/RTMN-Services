/**
 * Genie Device Integration Service
 * Connects phones, watches, earbuds, glasses, cars
 * Port: 4769
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4769;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const DEVICES = {
  smartphone: { name: 'Smartphone', brands: ['iOS', 'Android'] },
  smartwatch: { name: 'Smartwatch', brands: ['Apple Watch', 'Galaxy Watch', 'Wear OS'] },
  earbuds: { name: 'Earbuds', brands: ['AirPods', 'Galaxy Buds', 'Sony'] },
  glasses: { name: 'Smart Glasses', brands: ['Ray-Ban Meta', 'Snap Spectacles'] },
  car: { name: 'Car', brands: ['Android Auto', 'CarPlay', 'Tesla'] },
  laptop: { name: 'Laptop', brands: ['Windows', 'macOS', 'Chrome OS'] }
};

const devices = new Map();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'device-integration', port: PORT });
});

app.get('/api/devices', (req, res) => {
  res.json({ devices: Array.from(devices.values()) });
});

app.post('/api/devices', (req, res) => {
  const { deviceId, type, userId } = req.body;
  const device = { deviceId: deviceId || uuidv4().slice(0, 8), type, userId, status: 'active' };
  devices.set(device.deviceId, device);
  res.status(201).json(device);
});

app.get('/api/types', (req, res) => {
  res.json({ types: DEVICES });
});

app.delete('/api/devices/:id', (req, res) => {
  devices.delete(req.params.id);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`📱 Device Integration Service running on port ${PORT}`);
});

module.exports = app;
