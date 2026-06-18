import { Router } from 'express';

const router = Router();

// In-memory activity storage
const activities = new Map();

// GET /activities - List activities with filtering
router.get('/', (req, res) => {
  const { leadId, type } = req.query;
  let results = Array.from(activities.values());

  if (leadId) {
    results = results.filter(a => a.leadId === leadId);
  }
  if (type) {
    results = results.filter(a => a.type === type);
  }

  // Sort by timestamp descending
  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({ success: true, activities: results.slice(0, 50) });
});

// GET /activities/:id - Get single activity
router.get('/:id', (req, res) => {
  const activity = activities.get(req.params.id);
  if (!activity) return res.status(404).json({ error: 'Activity not found' });
  res.json({ success: true, activity });
});

// POST /activities - Create new activity
router.post('/', (req, res) => {
  const { leadId, type, description } = req.body;

  if (!leadId || !type) {
    return res.status(400).json({ error: 'leadId and type are required' });
  }

  const id = `act_${Date.now()}`;
  const activity = {
    id,
    leadId,
    type,
    description,
    timestamp: new Date().toISOString()
  };
  activities.set(id, activity);
  res.status(201).json({ success: true, activity });
});

export default router;
