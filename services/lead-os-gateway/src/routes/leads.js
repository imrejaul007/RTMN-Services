import { Router } from 'express';
const router = Router();

const leads = [
  { id: '1', name: 'Sarah Johnson', company: 'TechCorp', email: 'sarah@techcorp.com', type: 'hot', score: 85 },
  { id: '2', name: 'Michael Chen', company: 'Acme', email: 'michael@acme.com', type: 'warm', score: 65 },
  { id: '3', name: 'Emily Rodriguez', company: 'GlobalCorp', email: 'emily@globalcorp.com', type: 'hot', score: 92 },
  { id: '4', name: 'David Kim', company: 'StartupXYZ', email: 'david@startupxyz.com', type: 'warm', score: 58 },
  { id: '5', name: 'Lisa Park', company: 'RetailCo', email: 'lisa@retailco.com', type: 'cold', score: 35 },
];

router.get('/', (req, res) => {
  res.json({ success: true, leads, total: leads.length });
});

router.get('/:id', (req, res) => {
  const lead = leads.find(l => l.id === req.params.id);
  lead ? res.json({ success: true, lead }) : res.status(404).json({ error: 'Not found' });
});

router.post('/', (req, res) => {
  const lead = { id: Date.now().toString(), ...req.body, score: 50 };
  leads.push(lead);
  res.status(201).json({ success: true, lead });
});

export default router;
