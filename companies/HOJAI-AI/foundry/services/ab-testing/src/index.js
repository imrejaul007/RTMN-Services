/**
 * HOJAI Studio - A/B Testing Service
 * Run experiments and optimize conversions
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4768;
app.use(express.json());

const experiments = new Map(); // expId -> experiment
const assignments = []; // user assignments
const conversions = []; // conversion events

// REST API - Create Experiment
app.post('/api/experiments', (req, res) => {
  const { projectId, name, hypothesis, variants, metrics, traffic = 100 } = req.body;
  const exp = {
    id: uuidv4(),
    projectId,
    name,
    hypothesis,
    variants: variants || [
      { id: 'control', name: 'Control', weight: 50 },
      { id: 'variant_a', name: 'Variant A', weight: 50 }
    ],
    metrics: metrics || [],
    traffic,
    status: 'draft',
    startedAt: null,
    results: null,
    createdAt: new Date().toISOString()
  };
  experiments.set(exp.id, exp);
  res.json(exp);
});

// REST API - Start Experiment
app.post('/api/experiments/:id/start', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  exp.status = 'running';
  exp.startedAt = new Date().toISOString();
  res.json(exp);
});

// REST API - Get Variant for User
app.get('/api/experiments/:id/variant', (req, res) => {
  const { userId } = req.query;
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });
  if (exp.status !== 'running') return res.json({ variant: exp.variants[0].id });

  // Hash user to deterministic variant
  const hash = hashCode(userId || Math.random().toString());
  const bucket = hash % 100;
  let cumulative = 0;
  let variant = exp.variants[0].id;

  for (const v of exp.variants) {
    cumulative += v.weight;
    if (bucket < cumulative) { variant = v.id; break; }
  }

  // Record assignment
  assignments.push({ expId: exp.id, userId, variant, timestamp: new Date().toISOString() });

  res.json({ variant, experimentId: exp.id });
});

// REST API - Track Conversion
app.post('/api/conversions', (req, res) => {
  const { experimentId, userId, metric, value } = req.body;
  conversions.push({
    id: uuidv4(),
    experimentId,
    userId,
    metric,
    value,
    timestamp: new Date().toISOString()
  });
  res.json({ tracked: true });
});

// REST API - Get Results
app.get('/api/experiments/:id/results', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Not found' });

  const expConversions = conversions.filter(c => c.experimentId === exp.id);
  const expAssignments = assignments.filter(a => a.expId === exp.id);

  const results = {
    experimentId: exp.id,
    status: exp.status,
    participants: expAssignments.length,
    variants: exp.variants.map(v => {
      const variantConversions = expConversions.filter(c => {
        const assignment = expAssignments.find(a => a.userId === c.userId && a.variant === v.id);
        return assignment;
      });
      const variantParticipants = expAssignments.filter(a => a.variant === v.id).length;
      return {
        id: v.id,
        name: v.name,
        participants: variantParticipants,
        conversions: variantConversions.length,
        conversionRate: variantParticipants > 0 ? (variantConversions.length / variantParticipants * 100).toFixed(2) : 0
      };
    }),
    significance: calculateSignificance(expConversions.length, expAssignments.length)
  };

  exp.results = results;
  res.json(results);
});

// REST API - List Experiments
app.get('/api/experiments', (req, res) => {
  const { projectId, status } = req.query;
  let list = Array.from(experiments.values());
  if (projectId) list = list.filter(e => e.projectId === projectId);
  if (status) list = list.filter(e => e.status === status);
  res.json(list);
});

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function calculateSignificance(conversions, participants) {
  if (conversions < 100 || participants < 1000) return 'low';
  if (conversions > 500 && participants > 5000) return 'high';
  return 'medium';
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ab-testing', experiments: experiments.size }));
app.listen(PORT, () => console.log(`A/B Testing running on port ${PORT}`));
