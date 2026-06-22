/**
 * HOJAI Training Connector
 * Connect REZ and HOJAI signals to training
 *
 * Port: 4890
 */

import express from 'express';
import mongoose from 'mongoose';
import { v4 as uuid } from 'uuid';
import axios from 'axios';

const app = express();
app.use(express.json({ limit: "10kb" }));

// Training data collected from both ecosystems
const TrainingDataSchema = new mongoose.Schema({
  dataId: String,
  source: String,
  tenantId: String,
  type: String,
  content: String,
  label: String,
  quality: Number,
  createdAt: Date
});

const TrainingData = mongoose.model('TrainingData', TrainingDataSchema);

// REZ signal → Training
app.post('/api/rez/signals', async (req, res) => {
  const { userId, type, properties, confidence, tenantId } = req.body;

  // High quality signals → training
  if (confidence > 0.8) {
    const data = new TrainingData({
      dataId: uuid(),
      source: 'REZ_SIGNAL',
      tenantId,
      type,
      content: JSON.stringify(properties),
      quality: confidence
    });
    await data.save();
  }

  res.json({ success: true });
});

// HOJAI feedback → Training
app.post('/api/hojai/feedback', async (req, res) => {
  const { agentId, type, quality, data, tenantId } = req.body;

  // High quality feedback → training
  if (quality > 0.7) {
    const training = new TrainingData({
      dataId: uuid(),
      source: 'HOJAI_FEEDBACK',
      tenantId,
      type,
      content: JSON.stringify(data),
      quality
    });
    await training.save();
  }

  res.json({ success: true });
});

// Corrections → Training (always)
app.post('/api/corrections', async (req, res) => {
  const { corrections, tenantId } = req.body;

  for (const c of corrections) {
    const data = new TrainingData({
      dataId: uuid(),
      source: 'CORRECTION',
      tenantId,
      type: 'correction',
      content: JSON.stringify(c),
      quality: 1.0
    });
    await data.save();
  }

  res.json({ success: true, count: corrections.length });
});

// Get training data
app.get('/api/training-data', async (req, res) => {
  const { source, limit = 100 } = req.query;
  const filter: any = {};
  if (source) filter.source = source;

  const data = await TrainingData.find(filter)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit as string));

  res.json({ success: true, data });
});

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', service: 'training-connector' }));

mongoose.connect('mongodb://localhost:27017/hojai-training-connector')
  .then(() => console.log('Training Connector on port 4890'))
  .then(() => app.listen(4890));

export default app;
