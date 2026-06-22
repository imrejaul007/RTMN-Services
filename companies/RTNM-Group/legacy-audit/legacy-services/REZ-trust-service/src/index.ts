/**
 * REZ Trust Service
 *
 * Cross-company trust scoring and reputation management
 * Port: 4180
 *
 * Features:
 * - Trust score calculation
 * - Reputation tracking
 * - Risk assessment
 * - Cross-company trust sharing
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());

const PORT = parseInt(process.env.PORT || '4180', 10);

// Types
type EntityType = 'user' | 'merchant' | 'company' | 'agent';
type TrustTier = 'trusted' | 'verified' | 'standard' | 'risky' | 'blocked';

interface TrustEvent {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  event_type: 'positive' | 'negative' | 'neutral';
  category: string;
  weight: number;
  description: string;
  source: string;
  timestamp: string;
}

interface TrustScore {
  entity_type: EntityType;
  entity_id: string;
  score: number;
  tier: TrustTier;
  factors: {
    name: string;
    impact: number;
    weight: number;
  }[];
  positive_events: number;
  negative_events: number;
  last_updated: string;
  history: {
    score: number;
    timestamp: string;
  }[];
}

// In-memory storage
const trustScores = new Map<string, TrustScore>();
const trustEvents = new Map<string, TrustEvent[]>();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-trust-service',
    version: '1.0.0',
    entities_tracked: trustScores.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// TRUST SCORE MANAGEMENT
// ============================================

// Get trust score
app.get('/api/trust/:entityType/:entityId', (req: Request, res: Response) => {
  const key = `${req.params.entityType}:${req.params.entityId}`;
  const score = trustScores.get(key);

  if (!score) {
    // Return default score for new entities
    res.json({
      entity_type: req.params.entityType,
      entity_id: req.params.entityId,
      score: 0.5,
      tier: 'standard',
      factors: [],
      positive_events: 0,
      negative_events: 0,
      last_updated: new Date().toISOString(),
      is_new: true
    });
    return;
  }

  res.json({ ...score, is_new: false });
});

// Update trust score
app.post('/api/trust/:entityType/:entityId', (req: Request, res: Response) => {
  try {
    const { event_type, category, weight, description, source } = req.body;

    if (!event_type || !category) {
      res.status(400).json({ error: 'Missing required fields: event_type, category' });
      return;
    }

    const key = `${req.params.entityType}:${req.params.entityId}`;
    const entityType = req.params.entityType as EntityType;

    // Get or create trust score
    let score = trustScores.get(key);
    if (!score) {
      score = {
        entity_type: entityType,
        entity_id: req.params.entityId,
        score: 0.5,
        tier: 'standard',
        factors: [],
        positive_events: 0,
        negative_events: 0,
        last_updated: new Date().toISOString(),
        history: [{ score: 0.5, timestamp: new Date().toISOString() }]
      };
    }

    // Record event
    const event: TrustEvent = {
      id: uuidv4(),
      entity_type: entityType,
      entity_id: req.params.entityId,
      event_type,
      category,
      weight: weight || 1,
      description: description || '',
      source: source || 'api',
      timestamp: new Date().toISOString()
    };

    const events = trustEvents.get(key) || [];
    events.push(event);
    trustEvents.set(key, events);

    // Update score
    const scoreChange = calculateScoreChange(event_type, weight || 1);
    score.score = Math.max(0, Math.min(1, score.score + scoreChange));
    score.last_updated = new Date().toISOString();

    if (event_type === 'positive') score.positive_events++;
    if (event_type === 'negative') score.negative_events++;

    // Update tier
    score.tier = calculateTier(score.score);

    // Update history
    score.history.push({ score: score.score, timestamp: score.last_updated });
    if (score.history.length > 30) score.history.shift();

    trustScores.set(key, score);

    res.json({ success: true, trust_score: score, event_id: event.id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Batch update trust
app.post('/api/trust/batch', (req: Request, res: Response) => {
  const { events } = req.body;

  if (!events || !Array.isArray(events)) {
    res.status(400).json({ error: 'Missing required field: events (array)' });
    return;
  }

  const results = events.map((event: any) => {
    const key = `${event.entity_type}:${event.entity_id}`;
    let score = trustScores.get(key);

    if (!score) {
      score = {
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        score: 0.5,
        tier: 'standard',
        factors: [],
        positive_events: 0,
        negative_events: 0,
        last_updated: new Date().toISOString(),
        history: []
      };
    }

    const scoreChange = calculateScoreChange(event.event_type, event.weight || 1);
    score.score = Math.max(0, Math.min(1, score.score + scoreChange));
    score.tier = calculateTier(score.score);
    score.last_updated = new Date().toISOString();

    if (event.event_type === 'positive') score.positive_events++;
    if (event.event_type === 'negative') score.negative_events++;

    trustScores.set(key, score);
    return { entity_id: event.entity_id, new_score: score.score };
  });

  res.json({ success: true, results });
});

// ============================================
// TRUST EVENTS
// ============================================

// Get events
app.get('/api/trust/:entityType/:entityId/events', (req: Request, res: Response) => {
  const key = `${req.params.entityType}:${req.params.entityId}`;
  const events = trustEvents.get(key) || [];

  const { event_type, category, since, until, limit = 100 } = req.query;

  let result = events;

  if (event_type) result = result.filter(e => e.event_type === event_type);
  if (category) result = result.filter(e => e.category === category);
  if (since) result = result.filter(e => new Date(e.timestamp) >= new Date(since as string));
  if (until) result = result.filter(e => new Date(e.timestamp) <= new Date(until as string));

  result = result.slice(-(parseInt(limit as string)));

  res.json({ events: result, count: result.length });
});

// ============================================
// TRUST QUERIES
// ============================================

// Find entities by trust tier
app.get('/api/trust/tier/:tier', (req: Request, res: Response) => {
  const tier = req.params.tier as TrustTier;

  const entities = Array.from(trustScores.values())
    .filter(s => s.tier === tier)
    .map(s => ({
      entity_type: s.entity_type,
      entity_id: s.entity_id,
      score: s.score,
      last_updated: s.last_updated
    }));

  res.json({ tier, entities, count: entities.length });
});

// Get trust leaderboard
app.get('/api/trust/leaderboard', (req: Request, res: Response) => {
  const { entity_type, limit = 20 } = req.query;

  let entities = Array.from(trustScores.values());

  if (entity_type) {
    entities = entities.filter(s => s.entity_type === entity_type);
  }

  // Sort by score descending
  entities.sort((a, b) => b.score - a.score);

  const leaderboard = entities.slice(0, parseInt(limit as string)).map((s, i) => ({
    rank: i + 1,
    entity_type: s.entity_type,
    entity_id: s.entity_id,
    score: s.score,
    tier: s.tier
  }));

  res.json({ leaderboard });
});

// ============================================
// CROSS-COMPANY TRUST
// ============================================

// Share trust score with another company
app.post('/api/trust/share', (req: Request, res: Response) => {
  const { entity_type, entity_id, target_company } = req.body;

  if (!entity_type || !entity_id || !target_company) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const key = `${entity_type}:${entity_id}`;
  const score = trustScores.get(key);

  // In production, this would call the target company's trust API
  res.json({
    success: true,
    shared_with: target_company,
    trust_score: score || { score: 0.5, tier: 'standard' },
    shared_at: new Date().toISOString()
  });
});

// Receive trust score from another company
app.post('/api/trust/receive', (req: Request, res: Response) => {
  const { entity_type, entity_id, source_company, trust_score, factors } = req.body;

  if (!entity_type || !entity_id || !source_company) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const key = `${entity_type}:${entity_id}`;
  let score = trustScores.get(key);

  if (!score) {
    score = {
      entity_type,
      entity_id,
      score: 0.5,
      tier: 'standard',
      factors: [],
      positive_events: 0,
      negative_events: 0,
      last_updated: new Date().toISOString(),
      history: []
    };
  }

  // Merge trust data (weighted average)
  if (trust_score !== undefined) {
    const currentWeight = score.factors.length * 0.1;
    const incomingWeight = 0.1;
    const totalWeight = currentWeight + incomingWeight;

    score.score = (score.score * currentWeight + trust_score * incomingWeight) / totalWeight;
    score.tier = calculateTier(score.score);
 score.last_updated = new Date().toISOString();

    if (factors) {
      score.factors.push(...factors.map((f: any) => ({
        ...f,
        source: source_company
      })));
    }
  }

  trustScores.set(key, score);

  res.json({ success: true, trust_score: score });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateScoreChange(eventType: string, weight: number): number {
  const baseChange = 0.05;
  const maxChange = 0.2;

  switch (eventType) {
    case 'positive':
      return Math.min(maxChange, baseChange * weight);
    case 'negative':
      return -Math.min(maxChange, baseChange * weight);
    default:
      return 0;
  }
}

function calculateTier(score: number): TrustTier {
  if (score >= 0.9) return 'trusted';
  if (score >= 0.7) return 'verified';
  if (score >= 0.4) return 'standard';
  if (score >= 0.2) return 'risky';
  return 'blocked';
}

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[TrustService Error]', err);
  res.status(500).json({ error: err.message });
});

// Start server
app.listen(PORT, () => {
  logger.info(REZ Trust Service - Port ${PORT}`);
  logger.info(  → Score: GET /api/trust/:type/:id`);
  logger.info(  → Update: POST /api/trust/:type/:id`);
  logger.info(  → Batch: POST /api/trust/batch`);
  logger.info(  → Leaderboard: GET /api/trust/leaderboard`);
  logger.info(  → Share: POST /api/trust/share`);
});

export default app;
