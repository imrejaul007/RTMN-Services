import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const consumptions = new Map();

router.get('/', (req, res) => {
  const { meterId, from, to } = req.query;
  let list = Array.from(consumptions.values());
  if (meterId) list = list.filter(c => c.meterId === meterId);
  res.json({ success: true, consumptions: list });
});

router.post('/', (req, res) => {
  const { meterId, reading, timestamp, unit } = req.body;
  if (!meterId || reading === undefined) return res.status(400).json({ error: 'Missing required fields' });

  const record = {
    id: uuidv4(), meterId, reading, timestamp: timestamp || new Date().toISOString(), unit: unit || 'kWh',
    status: 'recorded', createdAt: new Date().toISOString()
  };
  consumptions.set(record.id, record);
  res.status(201).json({ success: true, consumption: record });
});

router.get('/analytics/:meterId', (req, res) => {
  const records = Array.from(consumptions.values()).filter(c => c.meterId === req.params.meterId);
  const total = records.reduce((sum, r) => sum + r.reading, 0);
  const avg = records.length ? total / records.length : 0;

  res.json({
    success: true,
    meterId: req.params.meterId,
    totalConsumption: Math.round(total * 100) / 100,
    averageConsumption: Math.round(avg * 100) / 100,
    recordCount: records.length,
    anomalyDetected: false
  });
});

router.get('/forecast/:meterId', (req, res) => {
  const records = Array.from(consumptions.values()).filter(c => c.meterId === req.params.meterId);
  const avg = records.length ? records.reduce((sum, r) => sum + r.reading, 0) / records.length : 100;

  res.json({
    success: true,
    meterId: req.params.meterId,
    forecast: {
      next24h: Math.round(avg * 24 * 1.1),
      nextWeek: Math.round(avg * 168 * 1.05),
      nextMonth: Math.round(avg * 720 * 1.02)
    },
    confidence: 0.85
  });
});

export default router;
