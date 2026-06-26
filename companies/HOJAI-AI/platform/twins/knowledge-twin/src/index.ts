/**
 * Knowledge Twin Service
 * Port: 4739
 *
 * Manages employee knowledge:
 * - Knowledge nodes
 * - Expertise areas
 * - Knowledge gaps
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4739', 10);
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
interface KnowledgeNode {
  id: string;
  employeeId: string;
  concept: string;
  description: string;
  type: 'procedural' | 'declarative' | 'tacit' | 'explicit';
  category: string;
  tags: string[];
  confidence: number;
  source: 'document' | 'training' | 'experience' | 'certification';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verified: boolean;
  usageCount: number;
  teachingAbility: number;
  createdAt: string;
  updatedAt: string;
}

interface Expertise {
  id: string;
  employeeId: string;
  domain: string;
  subdomains: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'thought-leader';
  yearsExperience: number;
  certifications: string[];
  confidence: number;
}

interface KnowledgeGap {
  id: string;
  employeeId: string;
  topic: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  currentLevel: string;
  desiredLevel: string;
  filled: boolean;
  createdAt: string;
}

// Storage
const nodes = new Map<string, KnowledgeNode>();
const expertise = new Map<string, Expertise>();
const gaps = new Map<string, KnowledgeGap>();

function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${uuidv4().slice(0, 8)}`;
}

interface ApiError extends Error { statusCode?: number; code?: string; }
const errorHandler = (err: ApiError, _req: Request, res: Response, _next: NextFunction): void => {
  res.status(err.statusCode || 500).json({ success: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
};

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'knowledge-twin', version: VERSION, timestamp: new Date().toISOString(), stats: { nodes: nodes.size, expertise: expertise.size, gaps: gaps.size } });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, service: 'knowledge-twin', timestamp: new Date().toISOString() });
});

/**
 * Add knowledge node
 */
app.post('/api/twin/:employeeId/knowledge', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { concept, description, type, category, tags, source, level } = req.body;

    if (!concept) {
      const err: ApiError = new Error('concept is required'); err.statusCode = 400; throw err;
    }

    const node: KnowledgeNode = {
      id: generateId('node'),
      employeeId,
      concept,
      description: description || '',
      type: type || 'declarative',
      category: category || 'general',
      tags: tags || [],
      confidence: 50,
      source: source || 'experience',
      level: level || 'intermediate',
      verified: false,
      usageCount: 0,
      teachingAbility: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    nodes.set(node.id, node);
    res.status(201).json({ success: true, data: node });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'ADD_ERROR', message: error.message } });
  }
});

/**
 * Get all knowledge nodes
 */
app.get('/api/twin/:employeeId/knowledge', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { category, type, level, search } = req.query;

  let empNodes = Array.from(nodes.values()).filter(n => n.employeeId === employeeId);

  if (category) empNodes = empNodes.filter(n => n.category === category);
  if (type) empNodes = empNodes.filter(n => n.type === type);
  if (level) empNodes = empNodes.filter(n => n.level === level);
  if (search) {
    const s = (search as string).toLowerCase();
    empNodes = empNodes.filter(n =>
      n.concept.toLowerCase().includes(s) ||
      n.description.toLowerCase().includes(s) ||
      n.tags.some(t => t.toLowerCase().includes(s))
    );
  }

  res.json({ success: true, data: { nodes: empNodes, total: empNodes.length } });
});

/**
 * Get expertise areas
 */
app.get('/api/twin/:employeeId/knowledge/expertise', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empExpertise = Array.from(expertise.values()).filter(e => e.employeeId === employeeId);

  res.json({ success: true, data: { expertise: empExpertise, total: empExpertise.length } });
});

/**
 * Add expertise
 */
app.post('/api/twin/:employeeId/knowledge/expertise', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { domain, subdomains, level, yearsExperience, certifications } = req.body;

    if (!domain) {
      const err: ApiError = new Error('domain is required'); err.statusCode = 400; throw err;
    }

    const exp: Expertise = {
      id: generateId('expertise'),
      employeeId,
      domain,
      subdomains: subdomains || [],
      level: level || 'intermediate',
      yearsExperience: yearsExperience || 0,
      certifications: certifications || [],
      confidence: 50
    };

    expertise.set(exp.id, exp);
    res.status(201).json({ success: true, data: exp });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'EXPERTISE_ERROR', message: error.message } });
  }
});

/**
 * Get knowledge gaps
 */
app.get('/api/twin/:employeeId/knowledge/gaps', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const filled = req.query.filled === 'true';
  const empGaps = Array.from(gaps.values()).filter(g => g.employeeId === employeeId && g.filled === filled);

  res.json({ success: true, data: { gaps: empGaps, total: empGaps.length } });
});

/**
 * Add knowledge gap
 */
app.post('/api/twin/:employeeId/knowledge/gaps', (req: Request, res: Response) => {
  try {
    const { employeeId } = req.params;
    const { topic, priority, currentLevel, desiredLevel } = req.body;

    if (!topic) {
      const err: ApiError = new Error('topic is required'); err.statusCode = 400; throw err;
    }

    const gap: KnowledgeGap = {
      id: generateId('gap'),
      employeeId,
      topic,
      priority: priority || 'medium',
      currentLevel: currentLevel || 'none',
      desiredLevel: desiredLevel || 'expert',
      filled: false,
      createdAt: new Date().toISOString()
    };

    gaps.set(gap.id, gap);
    res.status(201).json({ success: true, data: gap });
  } catch (err) {
    const error = err as ApiError;
    res.status(error.statusCode || 500).json({ success: false, error: { code: 'GAP_ERROR', message: error.message } });
  }
});

/**
 * Query knowledge
 */
app.post('/api/twin/:employeeId/knowledge/query', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const { query, category } = req.body;

  if (!query) {
    return res.json({ success: true, data: { nodes: [], message: 'No query provided' } });
  }

  const s = query.toLowerCase();
  let empNodes = Array.from(nodes.values()).filter(n => n.employeeId === employeeId);

  if (category) empNodes = empNodes.filter(n => n.category === category);

  // Simple relevance scoring
  const scored = empNodes.map(n => {
    let score = 0;
    if (n.concept.toLowerCase().includes(s)) score += 10;
    if (n.description.toLowerCase().includes(s)) score += 5;
    if (n.tags.some(t => t.toLowerCase().includes(s))) score += 3;
    if (n.category.toLowerCase().includes(s)) score += 2;
    return { node: n, score };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

  res.json({
    success: true,
    data: {
      results: scored.slice(0, 20),
      total: scored.length,
      query
    }
  });
});

/**
 * Stats
 */
app.get('/api/twin/:employeeId/knowledge/stats', (req: Request, res: Response) => {
  const { employeeId } = req.params;
  const empNodes = Array.from(nodes.values()).filter(n => n.employeeId === employeeId);
  const empExpertise = Array.from(expertise.values()).filter(e => e.employeeId === employeeId);
  const empGaps = Array.from(gaps.values()).filter(g => g.employeeId === employeeId);

  const categories = [...new Set(empNodes.map(n => n.category))];
  const avgConfidence = empNodes.length > 0 ? empNodes.reduce((sum, n) => sum + n.confidence, 0) / empNodes.length : 0;

  res.json({
    success: true,
    data: {
      employeeId,
      totalNodes: empNodes.length,
      expertiseAreas: empExpertise.length,
      knowledgeGaps: empGaps.filter(g => !g.filled).length,
      categories,
      avgConfidence: Math.round(avgConfidence),
      topNodes: empNodes.sort((a, b) => b.confidence - a.confidence).slice(0, 5).map(n => ({ concept: n.concept, confidence: n.confidence }))
    }
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

app.use(errorHandler);

const server = app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║          Knowledge Twin Service - Started                  ║`);
  console.log(`╠═══════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  Features: Knowledge Nodes, Expertise, Gaps, Query        ║`);
  console.log(`╚═══════════════════════════════════════════════════════════════╝`);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
process.on('SIGINT', () => { server.close(() => process.exit(0)); });

export default app;
