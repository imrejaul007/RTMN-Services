import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const crops = new Map();

router.get('/', (req, res) => {
  const { farmId, status } = req.query;
  let list = Array.from(crops.values());
  if (farmId) list = list.filter(c => c.farmId === farmId);
  if (status) list = list.filter(c => c.status === status);
  res.json({ success: true, crops: list });
});

router.get('/:id', (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });
  res.json({ success: true, crop });
});

router.post('/', (req, res) => {
  const { farmId, name, variety, plantedDate, expectedHarvest, area } = req.body;
  if (!farmId || !name) return res.status(400).json({ error: 'Missing required fields' });

  const crop = {
    cropId: uuidv4(), farmId, name, variety, plantedDate, expectedHarvest, area,
    status: 'growing',
    health: 'good',
    yieldPrediction: null,
    createdAt: new Date().toISOString()
  };
  crops.set(crop.cropId, crop);
  res.status(201).json({ success: true, crop });
});

router.post('/:id/health-check', (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });

  const healthScore = Math.round(70 + Math.random() * 30);
  crop.health = healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : healthScore > 40 ? 'fair' : 'poor';
  crop.lastHealthCheck = new Date().toISOString();
  res.json({ success: true, crop, healthScore });
});

router.post('/:id/yield-prediction', (req, res) => {
  const crop = crops.get(req.params.id);
  if (!crop) return res.status(404).json({ error: 'Crop not found' });

  const baseYield = 1000 + Math.random() * 500;
  crop.yieldPrediction = { quantity: Math.round(baseYield), unit: 'quintals', confidence: 0.85 };
  res.json({ success: true, prediction: crop.yieldPrediction });
});

export default router;
