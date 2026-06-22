import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const meters = new Map();

router.get('/', (req, res) => {
  const { status, type } = req.query;
  let list = Array.from(meters.values());
  if (status) list = list.filter(m => m.status === status);
  if (type) list = list.filter(m => m.type === type);
  res.json({ success: true, meters: list });
});

router.get('/:id', (req, res) => {
  const meter = meters.get(req.params.id);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });
  res.json({ success: true, meter });
});

router.post('/', (req, res) => {
  const { consumerId, type, location, capacity } = req.body;
  if (!consumerId || !type) return res.status(400).json({ error: 'Missing required fields' });

  const meter = {
    meterId: uuidv4(), consumerId, type, location, capacity,
    status: 'active', lastReading: null, lastReadingTime: null,
    createdAt: new Date().toISOString()
  };
  meters.set(meter.meterId, meter);
  res.status(201).json({ success: true, meter });
});

router.patch('/:id/readings', (req, res) => {
  const meter = meters.get(req.params.id);
  if (!meter) return res.status(404).json({ error: 'Meter not found' });

  const { reading } = req.body;
  meter.lastReading = reading;
  meter.lastReadingTime = new Date().toISOString();
  res.json({ success: true, meter });
});

export default router;
