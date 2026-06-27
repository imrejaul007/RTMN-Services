/**
 * Genie Memory Graph Service
 *
 * Unified Memory Layer that connects MemoryOS + TwinOS into one coherent graph.
 * This is the foundation layer that powers all Genie experiences.
 *
 * The Memory Graph contains:
 * - Identity Graph: User identity, preferences, personality
 * - Knowledge Graph: Facts, concepts, expertise
 * - Relationship Graph: People, connections, interactions
 * - Goal Graph: Objectives, progress, milestones
 * - Context Graph: Current situation, recent activities
 * - Timeline Graph: Events, memories, history
 * - Preference Graph: Likes, dislikes, patterns
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import { installReadinessRoutes, normalizeSeedData } from '@rtmn/shared/lib/genie-readiness';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

import identityRoutes from './routes/identity.js';
import knowledgeRoutes from './routes/knowledge.js';
import relationshipRoutes from './routes/relationship.js';
import goalRoutes from './routes/goal.js';
import timelineRoutes from './routes/timeline.js';
import preferenceRoutes from './routes/preference.js';
import graphRoutes from './routes/graph.js';
import searchRoutes from './routes/search.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4717;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());


app.use(requireAuth);// In-memory graph storage
const graphStorage = {
  // Identity Graph
  identities: new PersistentMap('collection-1', { serviceName: 'genie-memory-graph' }), // userId -> identity data

  // Knowledge Graph (triples: subject, predicate, object)
  knowledgeTriples: new PersistentMap('collection-2', { serviceName: 'genie-memory-graph' }), // userId -> array of triples

  // Relationship Graph
  relationships: new PersistentMap('collection-3', { serviceName: 'genie-memory-graph' }), // userId -> array of relationships

  // Goal Graph
  goals: new PersistentMap('collection-4', { serviceName: 'genie-memory-graph' }), // userId -> array of goals

  // Timeline Graph
  events: new PersistentMap('collection-5', { serviceName: 'genie-memory-graph' }), // userId -> array of timeline events

  // Preference Graph
  preferences: new PersistentMap('collection-6', { serviceName: 'genie-memory-graph' }), // userId -> preference data

  // Context Graph
  contexts: new PersistentMap('collection-7', { serviceName: 'genie-memory-graph' }), // userId -> current context

  // Node and edge indices for fast traversal
  nodes: new PersistentMap('collection-8', { serviceName: 'genie-memory-graph' }), // userId -> Map<nodeId, nodeData>
  edges: new PersistentMap('collection-9', { serviceName: 'genie-memory-graph' })  // userId -> Map<nodeId, array<edgeData>>
};

// Share storage with routes
app.locals.graphStorage = graphStorage;

// Routes
app.use('/', identityRoutes);
app.use('/knowledge', knowledgeRoutes);
app.use('/relationship', relationshipRoutes);
app.use('/goal', goalRoutes);
app.use('/timeline', timelineRoutes);
app.use('/preference', preferenceRoutes);
app.use('/graph', graphRoutes);
app.use('/search', searchRoutes);

// Health check
app.get('/health', (req, res) => {
  const userCount = graphStorage.identities.size;
  const totalTriples = Array.from(graphStorage.knowledgeTriples.values())
    .reduce((sum, arr) => sum + arr.length, 0);
  const totalRelationships = Array.from(graphStorage.relationships.values())
    .reduce((sum, arr) => sum + arr.length, 0);

  res.json({
    status: 'healthy',
    service: 'genie-memory-graph',
    port: PORT,
    version: '1.0.0',
    stats: {
      users: userCount,
      knowledgeTriples: totalTriples,
      relationships: totalRelationships,
      goals: Array.from(graphStorage.goals.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      events: Array.from(graphStorage.events.values())
        .reduce((sum, arr) => sum + arr.length, 0)
    },
    graphs: [
      'identity',
      'knowledge',
      'relationship',
      'goal',
      'timeline',
      'preference',
      'context'
    ],
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  res.json({
    ready: true,
    service: 'genie-memory-graph',
    version: '1.0.0',
    graphs: {
      identity: true,
      knowledge: true,
      relationship: true,
      goal: true,
      timeline: true,
      preference: true,
      context: true
    }
  });
});

// User graph overview
app.get('/api/user/:userId/graph', async (req, res) => {
  const { userId } = req.params;
  const storage = graphStorage;

  const identity = storage.identities.get(userId);
  const knowledgeCount = storage.knowledgeTriples.get(userId)?.length || 0;
  const relationshipsCount = storage.relationships.get(userId)?.length || 0;
  const goals = storage.goals.get(userId)?.filter(g => g.status === 'active') || [];
  const recentEvents = (storage.events.get(userId) || [])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
  const preferences = storage.preferences.get(userId);

  res.json({
    success: true,
    userId,
    overview: {
      identity: identity ? { name: identity.name, created: identity.createdAt } : null,
      knowledgeCount,
      relationshipsCount,
      activeGoals: goals.length,
      recentEvents: recentEvents.length,
      hasPreferences: !!preferences
    },
    quickStats: {
      totalKnowledge: knowledgeCount,
      totalRelationships: relationshipsCount,
      totalGoals: storage.goals.get(userId)?.length || 0,
      totalEvents: storage.events.get(userId)?.length || 0
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Install readiness routes (LLM + DB + combined readiness) BEFORE the catch-all 404
// so /api/llm-health, /api/db-health, /api/readiness are not intercepted as 404s.
installReadinessRoutes(app, { serviceName: 'genie-memory-graph' });

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
    suggestion: 'Try /api/user/:userId/graph for user overview'
  });
});

// Seed the graph stores on first boot
// Note: graphStorage stores keyed by userId, with values being ARRAYS of items.
// The shared autoSeed helper wraps each item in an object, which doesn't match the
// expected shape, so we seed the array stores directly here.
if (graphStorage.identities.size === 0) {
  const seedIdentities = normalizeSeedData([
    { id: 'demo-user', name: 'Demo User', createdAt: '2026-01-15T00:00:00Z', preferences: { theme: 'dark', language: 'en' } },
    { id: 'demo-user-2', name: 'Second User', createdAt: '2026-02-20T00:00:00Z', preferences: { theme: 'light', language: 'hi' } },
  ]);
  for (const i of seedIdentities) graphStorage.identities.set(i.id, i);
}
if (graphStorage.knowledgeTriples.size === 0) {
  graphStorage.knowledgeTriples.set('demo-user', [
    { subject: 'demo-user', predicate: 'works_at', object: 'HOJAI AI' },
    { subject: 'demo-user', predicate: 'role', object: 'founder' },
    { subject: 'demo-user', predicate: 'lives_in', object: 'Mumbai' },
  ]);
  graphStorage.knowledgeTriples.set('demo-user-2', [
    { subject: 'demo-user-2', predicate: 'works_at', object: 'Acme Corp' },
    { subject: 'demo-user-2', predicate: 'role', object: 'engineer' },
  ]);
}
if (graphStorage.relationships.size === 0) {
  graphStorage.relationships.set('demo-user', [
    { person: 'Ali Khan', relationship: 'partner', strength: 0.9 },
    { person: 'Priya Sharma', relationship: 'colleague', strength: 0.7 },
  ]);
}
if (graphStorage.goals.size === 0) {
  graphStorage.goals.set('demo-user', [
    { id: 'goal-1', title: 'Launch CorpPerks v2', status: 'active', progress: 0.6, targetDate: '2026-09-30' },
    { id: 'goal-2', title: 'Hire 5 engineers', status: 'active', progress: 0.4, targetDate: '2026-12-31' },
    { id: 'goal-3', title: 'Close Series A', status: 'active', progress: 0.3, targetDate: '2026-12-31' },
  ]);
}
if (graphStorage.events.size === 0) {
  graphStorage.events.set('demo-user', [
    { id: 'evt-1', title: 'Team standup', timestamp: '2026-06-22T09:00:00Z', type: 'meeting' },
    { id: 'evt-2', title: 'Customer call - Acme', timestamp: '2026-06-22T14:00:00Z', type: 'meeting' },
    { id: 'evt-3', title: 'Investor pitch prep', timestamp: '2026-06-23T10:00:00Z', type: 'task' },
  ]);
}
if (graphStorage.preferences.size === 0) {
  graphStorage.preferences.set('demo-user', {
    likes: ['coffee', 'reading', 'travelling'],
    dislikes: ['meetings', 'spicy food'],
    communicationStyle: 'direct',
  });
}
console.log('[genie-memory-graph] demo data seeded');

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           GENIE MEMORY GRAPH SERVICE v1.0.0                ║
║                                                                ║
║  🧠 Unified Memory Layer for Genie AI                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Memory Graphs:                                                ║
║  • Identity Graph                                              ║
║  • Knowledge Graph                                             ║
║  • Relationship Graph                                          ║
║  • Goal Graph                                                  ║
║  • Timeline Graph                                              ║
║  • Preference Graph                                            ║
║  • Context Graph                                               ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

export default app;
