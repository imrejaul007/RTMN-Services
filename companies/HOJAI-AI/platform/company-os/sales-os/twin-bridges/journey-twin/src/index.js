/**
 * JourneyTwin Bridge - CustomerJourneyOS
 *
 * Full digital twin for customer journeys with:
 * - Journey stages, Goals, Milestones
 * - Participants, Activities
 * - Analytics, Recommendations
 *
 * Port: 5063
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5063;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const journeyTwins = new Map();

const sampleTwins = [
  {
    id: uuidv4(),
    journeyId: 'JRN001',
    name: 'TechCorp Enterprise Onboarding',
    type: 'onboarding',
    industry: 'Technology',
    stages: [
      { id: 's1', name: 'Welcome', order: 1, status: 'completed', duration: { min: 1, max: 3 }, successRate: 95 },
      { id: 's2', name: 'Setup', order: 2, status: 'completed', duration: { min: 3, max: 7 }, successRate: 88 },
      { id: 's3', name: 'Integration', order: 3, status: 'active', duration: { min: 7, max: 14 }, successRate: 75 },
      { id: 's4', name: 'Training', order: 4, status: 'pending', duration: { min: 14, max: 21 }, successRate: 82 },
      { id: 's5', name: 'Go-Live', order: 5, status: 'pending', duration: { min: 21, max: 30 }, successRate: 90 },
    ],
    goals: [
      { id: 'g1', type: 'activation', metric: 'first_action', target: 1, current: 1, status: 'achieved' },
      { id: 'g2', type: 'adoption', metric: 'daily_active_users', target: 10, current: 6, status: 'at_risk' },
      { id: 'g3', type: 'engagement', metric: 'feature_usage', target: 5, current: 3, status: 'on_track' },
    ],
    progress: { overall: 45, velocity: 0.8, expectedCompletion: new Date('2026-07-15'), currentStage: 3 },
    participants: {
      customers: ['rahul@techcorp.in', 'ankit@techcorp.in'],
      agents: ['onboarding-agent'],
      humans: ['CS Manager'],
    },
    outcomes: { completed: ['s1', 's2'], pending: ['s3', 's4', 's5'], failed: [] },
    intelligence: {
      successFactors: ['Executive sponsorship', 'Dedicated resources'],
      failureFactors: ['Complex integrations'],
      recommendedActions: ['Schedule training session', 'Assign integration specialist'],
      similarJourneys: ['JRN005', 'JRN012'],
    },
    metrics: { avgCompletionTime: 25, successRate: 82, avgEngagement: 72 },
    status: 'active',
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    journeyId: 'JRN002',
    name: 'Global Retail Expansion Campaign',
    type: 'expansion',
    industry: 'Retail',
    stages: [
      { id: 's1', name: 'Health Check', order: 1, status: 'completed', duration: { min: 1, max: 3 }, successRate: 100 },
      { id: 's2', name: 'Needs Analysis', order: 2, status: 'active', duration: { min: 3, max: 7 }, successRate: 85 },
      { id: 's3', name: 'Proposal', order: 3, status: 'pending', duration: { min: 7, max: 14 }, successRate: 78 },
      { id: 's4', name: 'Negotiation', order: 4, status: 'pending', duration: { min: 14, max: 21 }, successRate: 70 },
    ],
    goals: [
      { id: 'g1', type: 'revenue', metric: 'expansion_arr', target: 50000, current: 0, status: 'pending' },
      { id: 'g2', type: 'adoption', metric: 'seat_expansion', target: 20, current: 0, status: 'pending' },
    ],
    progress: { overall: 25, velocity: 1.2, expectedCompletion: new Date('2026-08-01'), currentStage: 2 },
    participants: { customers: ['amit@globalretail.com'], agents: ['expansion-agent'], humans: ['AE'] },
    outcomes: { completed: ['s1'], pending: ['s2', 's3', 's4'], failed: [] },
    intelligence: {
      successFactors: ['High engagement', 'Clear budget'],
      failureFactors: ['Legal review risk'],
      recommendedActions: ['Prepare legal documentation', 'Schedule executive alignment'],
      similarJourneys: ['JRN008', 'JRN015'],
    },
    metrics: { avgCompletionTime: 18, successRate: 78, avgEngagement: 65 },
    status: 'active',
    createdAt: new Date('2026-06-15'),
    updatedAt: new Date(),
  },
];

sampleTwins.forEach(t => journeyTwins.set(t.id, t));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'JourneyTwin Bridge',
    version: '1.0.0',
    port: PORT,
    twinsCount: journeyTwins.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, twins: Array.from(journeyTwins.values()) });
});

app.get('/:id', (req, res) => {
  const twin = journeyTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'JourneyTwin not found' });
  res.json({ success: true, twin });
});

app.post('/', (req, res) => {
  const twin = {
    id: uuidv4(),
    journeyId: req.body.journeyId,
    name: req.body.name,
    type: req.body.type || 'acquisition',
    industry: req.body.industry || 'general',
    stages: req.body.stages || [],
    goals: req.body.goals || [],
    progress: { overall: 0, velocity: 0, expectedCompletion: null, currentStage: 0 },
    participants: { customers: [], agents: [], humans: [] },
    outcomes: { completed: [], pending: [], failed: [] },
    intelligence: {
      successFactors: [],
      failureFactors: [],
      recommendedActions: [],
      similarJourneys: [],
    },
    metrics: { avgCompletionTime: 0, successRate: 0, avgEngagement: 0 },
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  journeyTwins.set(twin.id, twin);
  res.status(201).json({ success: true, twin });
});

app.put('/:id', (req, res) => {
  const twin = journeyTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'JourneyTwin not found' });
  const updated = { ...twin, ...req.body, updatedAt: new Date() };
  journeyTwins.set(twin.id, updated);
  res.json({ success: true, twin: updated });
});

// Progress management
app.post('/:id/advance', (req, res) => {
  const twin = journeyTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'JourneyTwin not found' });

  const { stageId } = req.body;
  const stage = twin.stages.find(s => s.id === stageId);
  if (!stage) return res.status(404).json({ error: 'Stage not found' });

  if (!twin.outcomes.completed.includes(stageId)) {
    twin.outcomes.completed.push(stageId);
    twin.progress.currentStage = stage.order;
  }

  twin.progress.overall = calculateProgress(twin);
  twin.updatedAt = new Date();
  journeyTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

app.post('/:id/goal', (req, res) => {
  const twin = journeyTwins.get(req.params.id);
  if (!twin) return res.status(404).json({ error: 'JourneyTwin not found' });

  const { goalId, current } = req.body;
  const goal = twin.goals.find(g => g.id === goalId);
  if (!goal) return res.status(404).json({ error: 'Goal not found' });

  goal.current = current;
  if (current >= goal.target) {
    goal.status = 'achieved';
  } else if (current >= goal.target * 0.7) {
    goal.status = 'on_track';
  } else if (current >= goal.target * 0.4) {
    goal.status = 'at_risk';
  } else {
    goal.status = 'behind';
  }

  twin.updatedAt = new Date();
  journeyTwins.set(twin.id, twin);
  res.json({ success: true, twin });
});

// ============================================================
// HELPERS
// ============================================================

function calculateProgress(twin) {
  if (twin.stages.length === 0) return 0;
  const completedStages = twin.outcomes.completed.length;
  const stageProgress = (completedStages / twin.stages.length) * 100;
  const goalProgress = twin.goals.reduce((sum, g) => {
    if (g.status === 'achieved') return sum + 100 / twin.goals.length;
    return sum + (g.current / g.target) * (100 / twin.goals.length);
  }, 0);
  return Math.round((stageProgress + goalProgress) / 2);
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║        JourneyTwin Bridge - SalesOS v1.0          ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Twins: ${journeyTwins.size}                                       ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
