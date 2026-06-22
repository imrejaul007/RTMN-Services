// ============================================================================
// SUTAR Memory Bridge - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4143;
const START_TIME = Date.now();

export type MemoryType = 'context' | 'fact' | 'preference' | 'history' | 'session';
export type MemoryStatus = 'active' | 'archived' | 'deleted';

export interface Memory {
  id: string;
  entityId: string;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  tags: string[];
  status: MemoryStatus;
  accessCount: number;
  lastAccessed: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

const memories = new Map<string, Memory>();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Too many requests' } });
app.use('/api/', limiter);

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({ success, data, error, timestamp: new Date().toISOString(), requestId });

app.get('/health', (_req: Request, res: Response) => res.json(apiResponse(true, { status: 'healthy', service: 'sutar-memory-bridge', version: '1.0.0', uptime: Math.floor((Date.now() - START_TIME) / 1000) })));
app.get('/health/ready', (_req: Request, res: Response) => res.json(apiResponse(true, { ready: true })));
app.get('/health/live', (_req: Request, res: Response) => res.json(apiResponse(true, { alive: true })));

app.post('/api/v1/memories', (req: Request, res: Response) => {
  try {
    const { entityId, type, content, metadata, tags } = req.body;
    if (!entityId || !content) { res.status(400).json(apiResponse(false, undefined, 'entityId and content required')); return; }
    const memory: Memory = {
      id: `memory-${uuidv4()}`,
      entityId, type: type || 'context', content,
      metadata: metadata || {},
      tags: tags || [],
      status: 'active',
      accessCount: 0,
      lastAccessed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    memories.set(memory.id, memory);
    console.log(`[MEMORY] Stored: ${memory.id}`);
    res.status(201).json(apiResponse(true, memory, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.get('/api/v1/memories', (req: Request, res: Response) => {
  const { entityId, type, tags, limit = 50, offset = 0 } = req.query;
  let result = Array.from(memories.values()).filter(m => m.status === 'active');
  if (entityId) result = result.filter(m => m.entityId === entityId);
  if (type) result = result.filter(m => m.type === type);
  if (tags) {
    const tagList = String(tags).split(',');
    result = result.filter(m => tagList.some(t => m.tags.includes(t)));
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));
  res.json(apiResponse(true, { memories: result, total, limit: Number(limit), offset: Number(offset) }));
});

app.get('/api/v1/memories/:id', (req: Request, res: Response) => {
  const memory = memories.get(req.params.id);
  if (!memory || memory.status === 'deleted') { res.status(404).json(apiResponse(false, undefined, 'Memory not found')); return; }
  memory.accessCount++;
  memory.lastAccessed = new Date().toISOString();
  memories.set(memory.id, memory);
  res.json(apiResponse(true, memory));
});

app.delete('/api/v1/memories/:id', (req: Request, res: Response) => {
  const memory = memories.get(req.params.id);
  if (!memory) { res.status(404).json(apiResponse(false, undefined, 'Memory not found')); return; }
  memory.status = 'deleted';
  memories.set(memory.id, memory);
  res.json(apiResponse(true, { deleted: memory.id }));
});

app.use((_req: Request, res: Response) => res.status(404).json(apiResponse(false, undefined, 'Not found')));
app.use((err: Error, _req: Request, res: Response) => res.status(500).json(apiResponse(false, undefined, err.message)));

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

app.listen(PORT, () => console.log(`\nSUTAR MEMORY BRIDGE running on port ${PORT}\n`));

export default app;
