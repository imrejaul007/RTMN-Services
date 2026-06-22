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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    path: req.path,
    suggestion: 'Try /api/user/:userId/graph for user overview'
  });
});

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
