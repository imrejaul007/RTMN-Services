/**
 * Relationship OS — v1.0.0
 * ======================
 * Full relationship graph with trust hierarchy, context, and history:
 * - Relationship nodes and graph
 * - Trust scoring and levels
 * - Voice preferences per relationship
 * - Interaction history
 * - Relationship clusters
 *
 * Port: 4897
 */

import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Services
import { RelationshipGraphService } from './services/relationshipGraph.js';

// Types
import type {
  RelationshipType,
  TrustLevel,
  VoicePreferences
} from './types/index.js';

// ── App Setup ────────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// ── Service ─────────────────────────────────────────────────────────────────

const relationshipService = new RelationshipGraphService();

// ── Request Schemas ───────────────────────────────────────────────────────────

const CreateRelationshipSchema = z.object({
  userId: z.string().min(1),
  targetId: z.string().min(1),
  targetName: z.string().min(1),
  targetType: z.enum(['human', 'ai', 'bot', 'company']),
  type: z.enum(['family', 'friend', 'colleague', 'boss', 'partner', 'client', 'acquaintance', 'service', 'ai']),
  context: z.object({
    howMet: z.string().optional(),
    commonInterests: z.array(z.string()).optional(),
    sharedGroups: z.array(z.string()).optional(),
    location: z.string().optional(),
    language: z.string().optional(),
    formalityLevel: z.number().min(0).max(1).optional(),
  }).optional(),
});

const UpdateTrustSchema = z.object({
  relationshipId: z.string().min(1),
  delta: z.number().min(-50).max(50),
  reason: z.string().min(1),
  interactionType: z.enum(['call', 'message', 'meeting', 'email', 'voice']).optional(),
});

const UpdateVoicePrefsSchema = z.object({
  relationshipId: z.string().min(1),
  greeting: z.string().optional(),
  formality: z.number().min(0).max(1).optional(),
  useName: z.boolean().optional(),
  nameStyle: z.enum(['first', 'nickname', 'full', 'honorific']).optional(),
  humorLevel: z.enum(['none', 'light', 'moderate', 'high']).optional(),
  interruptionAllowed: z.boolean().optional(),
  speakingPace: z.enum(['slow', 'normal', 'fast']).optional(),
  volumeLevel: z.enum(['soft', 'normal', 'loud']).optional(),
  specialNotes: z.string().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/relationships
 * Create a new relationship
 */
app.post('/api/relationships', async (req, res) => {
  try {
    const data = CreateRelationshipSchema.parse(req.body);

    const relationship = relationshipService.createRelationship(
      data.userId,
      data.targetId,
      data.targetName,
      data.targetType,
      data.type,
      data.context
    );

    res.json({
      success: true,
      relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[relationship-os]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/relationships/:userId
 * Get all relationships for user
 */
app.get('/api/relationships/:userId', (req, res) => {
  const { userId } = req.params;
  const { type, trustLevel } = req.query;

  let relationships = relationshipService.getAllForUser(userId);

  if (type) {
    relationships = relationships.filter(r => r.type === type);
  }
  if (trustLevel) {
    relationships = relationships.filter(r => r.trustLevel === trustLevel);
  }

  res.json({
    success: true,
    relationships,
    count: relationships.length,
  });
});

/**
 * GET /api/relationships/:userId/:targetId
 * Get relationship between user and target
 */
app.get('/api/relationships/:userId/:targetId', (req, res) => {
  const { userId, targetId } = req.params;

  const relationship = relationshipService.getRelationshipByTarget(userId, targetId);

  if (!relationship) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  res.json({
    success: true,
    relationship,
  });
});

/**
 * GET /api/relationships/:relationshipId
 * Get relationship by ID
 */
app.get('/api/relationships/id/:relationshipId', (req, res) => {
  const { relationshipId } = req.params;

  const relationship = relationshipService.getRelationship(relationshipId);

  if (!relationship) {
    return res.status(404).json({ success: false, error: 'Relationship not found' });
  }

  res.json({
    success: true,
    relationship,
  });
});

/**
 * PATCH /api/relationships/:relationshipId/trust
 * Update trust score
 */
app.patch('/api/relationships/:relationshipId/trust', async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const { delta, reason, interactionType } = UpdateTrustSchema.parse(req.body);

    const relationship = relationshipService.updateTrust(
      relationshipId,
      delta,
      reason,
      interactionType
    );

    res.json({
      success: true,
      relationship,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[relationship-os]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/relationships/:userId/graph
 * Get full relationship graph
 */
app.get('/api/relationships/:userId/graph', (req, res) => {
  const { userId } = req.params;

  const graph = relationshipService.buildGraph(userId);

  res.json({
    success: true,
    graph,
  });
});

/**
 * GET /api/relationships/:relationshipId/voice-preferences
 * Get voice preferences for relationship
 */
app.get('/api/relationships/:relationshipId/voice-preferences', (req, res) => {
  const { relationshipId } = req.params;

  const prefs = relationshipService.getVoicePreferences(relationshipId);

  if (!prefs) {
    return res.status(404).json({ success: false, error: 'Voice preferences not found' });
  }

  res.json({
    success: true,
    preferences: prefs,
  });
});

/**
 * PATCH /api/relationships/:relationshipId/voice-preferences
 * Update voice preferences
 */
app.patch('/api/relationships/:relationshipId/voice-preferences', async (req, res) => {
  try {
    const { relationshipId } = req.params;
    const updates = UpdateVoicePrefsSchema.parse({ relationshipId, ...req.body });

    const prefs = relationshipService.updateVoicePreferences(relationshipId, updates);

    res.json({
      success: true,
      preferences: prefs,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, errors: error.errors });
    }
    console.error('[relationship-os]', error);
    res.status(500).json({ success: false, error: 'Internal error' });
  }
});

/**
 * GET /api/relationships/:userId/family
 * Get family relationships
 */
app.get('/api/relationships/:userId/family', (req, res) => {
  const { userId } = req.params;

  const family = relationshipService.getByType(userId, 'family');

  res.json({
    success: true,
    relationships: family,
    count: family.length,
  });
});

/**
 * GET /api/relationships/:userId/colleagues
 * Get work relationships
 */
app.get('/api/relationships/:userId/colleagues', (req, res) => {
  const { userId } = req.params;

  const colleagues = relationshipService.getByType(userId, 'colleague');

  res.json({
    success: true,
    relationships: colleagues,
    count: colleagues.length,
  });
});

/**
 * GET /health
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'relationship-os',
    port: process.env.PORT || 4897,
    version: '1.0.0',
    capabilities: [
      'relationship-management',
      'trust-scoring',
      'voice-preferences',
      'interaction-history',
      'relationship-graph',
      'clusters'
    ],
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /ready
 */
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      relationshipGraph: true,
    },
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 4897;

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║              RELATIONSHIP OS v1.0.0                      ║
║                                                                ║
║  🔗  Relationship Graph & Trust                       ║
║                                                                ║
║  Port: ${PORT}                                                  ║
║  Status: RUNNING                                               ║
║                                                                ║
║  Capabilities:                                                 ║
║  • Relationship nodes & graph                                ║
║  • Trust scoring (0-100)                                    ║
║  • Voice preferences per relationship                       ║
║  • Interaction history                                       ║
║  • Relationship clusters (family, work, social)            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('[relationship-os] Shutting down...');
  server.close(() => process.exit(0));
});

export default app;
