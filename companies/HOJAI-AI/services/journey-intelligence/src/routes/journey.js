import { Router } from 'express';

const router = Router();

// In-memory journey storage
const journeys = new Map();

// Seed sample journeys
const seedJourneys = [
  { leadId: 'lead_sample_1', stage: 'awareness', company: 'TechCorp', value: 50000 },
  { leadId: 'lead_sample_2', stage: 'consideration', company: 'Acme Corp', value: 75000 },
  { leadId: 'lead_sample_3', stage: 'acquisition', company: 'GlobalTech', value: 100000 },
];

seedJourneys.forEach(j => {
  const id = `journey_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  journeys.set(id, {
    id,
    ...j,
    milestones: [],
    createdAt: new Date().toISOString()
  });
});

// GET /journey - List all journeys
router.get('/', (req, res) => {
  const { stage, leadId } = req.query;
  let results = Array.from(journeys.values());

  if (stage) {
    results = results.filter(j => j.stage === stage);
  }
  if (leadId) {
    results = results.filter(j => j.leadId === leadId);
  }

  res.json({ success: true, journeys: results });
});

// GET /journey/:id - Get single journey
router.get('/:id', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json({ success: true, journey });
});

// POST /journey - Create new journey
router.post('/', (req, res) => {
  const { leadId, stage, company, value } = req.body;

  if (!leadId) {
    return res.status(400).json({ error: 'leadId is required' });
  }

  const id = `journey_${Date.now()}`;
  const journey = {
    id,
    leadId,
    stage: stage || 'awareness',
    company,
    value: value || 0,
    milestones: [],
    createdAt: new Date().toISOString()
  };
  journeys.set(id, journey);
  res.status(201).json({ success: true, journey });
});

// PATCH /journey/:id - Update journey stage
router.patch('/:id', (req, res) => {
  const journey = journeys.get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const { stage, value } = req.body;
  const milestone = {
    from: journey.stage,
    to: stage,
    timestamp: new Date().toISOString()
  };

  const updated = {
    ...journey,
    stage: stage || journey.stage,
    value: value || journey.value,
    milestones: [...journey.milestones, milestone],
    updatedAt: new Date().toISOString()
  };
  journeys.set(req.params.id, updated);
  res.json({ success: true, journey: updated });
});

// DELETE /journey/:id - Delete journey
router.delete('/:id', (req, res) => {
  if (!journeys.has(req.params.id)) return res.status(404).json({ error: 'Journey not found' });
  journeys.delete(req.params.id);
  res.json({ success: true });
});

export default router;
