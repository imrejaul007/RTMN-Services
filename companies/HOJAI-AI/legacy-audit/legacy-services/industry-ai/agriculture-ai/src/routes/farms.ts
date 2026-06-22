import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const farms = new Map();

router.get('/', (req, res) => {
  const { ownerId, status } = req.query;
  let list = Array.from(farms.values());
  if (ownerId) list = list.filter(f => f.ownerId === ownerId);
  if (status) list = list.filter(f => f.status === status);
  res.json({ success: true, farms: list });
});

router.get('/:id', (req, res) => {
  const farm = farms.get(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  res.json({ success: true, farm });
});

router.post('/', (req, res) => {
  const { name, ownerId, location, area, soilType, irrigationType } = req.body;
  if (!name || !ownerId) return res.status(400).json({ error: 'Missing required fields' });

  const farm = {
    farmId: uuidv4(),
    name, ownerId, location, area, soilType, irrigationType,
    status: 'active',
    crops: [],
    livestock: [],
    equipment: [],
    createdAt: new Date().toISOString()
  };
  farms.set(farm.farmId, farm);
  res.status(201).json({ success: true, farm });
});

router.patch('/:id', (req, res) => {
  const farm = farms.get(req.params.id);
  if (!farm) return res.status(404).json({ error: 'Farm not found' });
  Object.assign(farm, req.body);
  res.json({ success: true, farm });
});

export default router;
