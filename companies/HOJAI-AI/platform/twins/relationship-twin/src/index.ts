/**
 * Relationship Twin Service
 * Port: 4744
 *
 * Captures and learns professional relationships:
 * - Network graph
 * - Influence mapping
 * - Interaction patterns
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4744', 10);
const VERSION = '1.0.0';

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = req.headers['x-request-id'] as string || uuidv4();
  next();
});

morgan.token('request-id', (req: Request) => (req as any).requestId);
app.use(morgan(':request-id :method :url :status :response-time ms'));

// Types
interface RelationshipNode {
  id: string;
  employeeId: string;
  name: string;
  email?: string;
  role: string;
  company?: string;
  type: 'internal' | 'external' | 'customer' | 'partner' | 'vendor';
  influence: number;
  trust: number;
  sentiment: number;
  contactFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  lastInteraction?: string;
  keyTopics: string[];
  strength: 'weak' | 'moderate' | 'strong';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface RelationshipEdge {
  id: string;
  source: string;
  target: string;
  type: 'collaborates' | 'reports-to' | 'manages' | 'influences' | 'mentors';
  weight: number;
  mutual: boolean;
  createdAt: string;
}

interface Interaction {
  id: string;
  employeeId: string;
  personId: string;
  type: 'meeting' | 'call' | 'email' | 'chat';
  subject?: string;
  outcome?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  duration?: number;
  timestamp: string;
}

// Storage
const nodes = new Map<string, RelationshipNode>();
const edges = new Map<string, RelationshipEdge>();
const interactions = new Map<string, Interaction>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'relationship-twin', version: VERSION, timestamp: new Date().toISOString(), stats: { nodes: nodes.size, edges: edges.size, interactions: interactions.size } });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'relationship-twin', timestamp: new Date().toISOString() });
});

/**
 * Get relationship graph
 */
app.get('/api/twin/:employeeId/relationship/graph', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const employeeNodes = Array.from(nodes.values()).filter(n => n.employeeId === employeeId);
  const nodeIds = new Set(employeeNodes.map(n => n.id));
  const employeeEdges = Array.from(edges.values()).filter(e => nodeIds.has(e.source) || nodeIds.has(e.target));

  // Calculate metrics
  const avgInfluence = employeeNodes.length > 0 ? employeeNodes.reduce((sum, n) => sum + n.influence, 0) / employeeNodes.length : 0;
  const avgTrust = employeeNodes.length > 0 ? employeeNodes.reduce((sum, n) => sum + n.trust, 0) / employeeNodes.length : 0;

  res.json({
    success: true,
    data: {
      employeeId,
      nodes: employeeNodes,
      edges: employeeEdges,
      metrics: {
        totalConnections: employeeNodes.length,
        strongConnections: employeeNodes.filter(n => n.strength === 'strong').length,
        avgInfluence: Math.round(avgInfluence),
        avgTrust: Math.round(avgTrust),
        networkDiversity: new Set(employeeNodes.map(n => n.type)).size
      },
      lastUpdated: new Date().toISOString()
    }
  });
});

/**
 * Add/update relationship
 */
app.post('/api/twin/:employeeId/relationship/connect', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { name, email, role, company, type = 'internal' } = req.body;

    if (!name) {
      const err: ApiError = new Error('name is required'); err.statusCode = 400; throw err;
    }

    const node: RelationshipNode = {
      id: generateId('node'),
      employeeId,
      name,
      email,
      role: role || '',
      company,
      type,
      influence: 50,
      trust: 50,
      sentiment: 0,
      contactFrequency: 'monthly',
      keyTopics: [],
      strength: 'moderate',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    nodes.set(node.id, node);
    res.status(201).json({ success: true, data: node });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'CONNECT_ERROR', message: error.message } });
  }
});

/**
 * Update relationship
 */
app.patch('/api/twin/:employeeId/relationship/:personId', (req: Request, res: Response) => {
  try {
    const { personId } = req.params;
    const updates = req.body;

    const node = nodes.get(personId);
    if (!node) {
      const err: ApiError = new Error('Relationship not found'); err.statusCode = 404; throw err;
    }

    Object.assign(node, updates, { updatedAt: new Date().toISOString() });
    res.json({ success: true, data: node });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
  }
});

/**
 * Add interaction
 */
app.post('/api/twin/:employeeId/relationship/interaction', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { personId, type, subject, outcome, sentiment, duration } = req.body;

    if (!personId || !type) {
      const err: ApiError = new Error('personId and type are required'); err.statusCode = 400; throw err;
    }

    const interaction: Interaction = {
      id: generateId('interaction'),
      employeeId,
      personId,
      type,
      subject,
      outcome,
      sentiment,
      duration,
      timestamp: new Date().toISOString()
    };

    interactions.set(interaction.id, interaction);

    // Update node metrics
    const node = nodes.get(personId);
    if (node) {
      node.lastInteraction = interaction.timestamp;
      node.contactFrequency = updateFrequency(interactions, personId);
      node.sentiment = updateSentiment(node.sentiment, sentiment);
      node.updatedAt = new Date().toISOString();
    }

    res.status(201).json({ success: true, data: interaction });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'INTERACTION_ERROR', message: error.message } });
  }
});

function updateFrequency(interactions: Map<string, Interaction>, personId: string): 'daily' | 'weekly' | 'monthly' | 'rarely' {
  const personInteractions = Array.from(interactions.values()).filter(i => i.personId === personId);
  const daysSinceFirst = personInteractions.length > 0 ?
    (Date.now() - new Date(personInteractions[0].timestamp).getTime()) / (1000 * 60 * 60 * 24) : 30;
  const interactionsPerDay = personInteractions.length / Math.max(1, daysSinceFirst);

  if (interactionsPerDay >= 1) return 'daily';
  if (interactionsPerDay >= 1/7) return 'weekly';
  if (interactionsPerDay >= 1/30) return 'monthly';
  return 'rarely';
}

function updateSentiment(current: number, newSentiment?: 'positive' | 'negative' | 'neutral'): number {
  const sentimentValue = newSentiment === 'positive' ? 1 : newSentiment === 'negative' ? -1 : 0;
  return (current + sentimentValue) / 2;
}

/**
 * Get influence metrics
 */
app.get('/api/twin/:employeeId/relationship/influence', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const employeeNodes = Array.from(nodes.values()).filter(n => n.employeeId === employeeId);

  const influencers = employeeNodes
    .filter(n => n.influence > 70)
    .sort((a, b) => b.influence - a.influence)
    .slice(0, 10);

  res.json({
    success: true,
    data: {
      employeeId,
      totalConnections: employeeNodes.length,
      keyInfluencers: influencers.map(n => ({ id: n.id, name: n.name, influence: n.influence })),
      avgNetworkInfluence: Math.round(employeeNodes.reduce((sum, n) => sum + n.influence, 0) / Math.max(1, employeeNodes.length))
    }
  });
});

/**
 * Get interaction history
 */
app.get('/api/twin/:employeeId/relationship/interactions/:personId', (req: Request, res: Response) => {
  const { employeeId, personId } = req.params;
  const personInteractions = Array.from(interactions.values())
    .filter(i => i.employeeId === employeeId && i.personId === personId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json({ success: true, data: { interactions: personInteractions, total: personInteractions.length } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Relationship Twin Service - Started                ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Network Graph, Influence, Interactions         ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
