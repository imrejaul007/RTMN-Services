/**
 * TwinOS Working Memory v1.0
 * Port: 4724
 *
 * Working memory service for digital twins.
 * Stores short-term context, current focus, and active tasks.
 */
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4724', 10);
const DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

// Types
interface MemoryItem {
  id: string;
  key: string;
  value: any;
  priority: number;
  createdAt: string;
  expiresAt: string;
}

interface WorkingContext {
  twinId: string;
  currentTask?: string;
  focus: string[];
  context: Record<string, any>;
  activeItems: MemoryItem[];
  pending: string[];
}

// Storage
const contexts = new Map<string, WorkingContext>();
const items = new Map<string, MemoryItem[]>();

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());

// Helper
function generateId(prefix: string): string {
  return `${prefix}-${uuidv4().slice(0, 8)}`;
}

function cleanupExpired(twinId: string): void {
  const twinItems = items.get(twinId) || [];
  const now = Date.now();
  const valid = twinItems.filter(item => new Date(item.expiresAt).getTime() > now);
  items.set(twinId, valid);
}

// Routes
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'twin-working-memory', version: '1.0.0' });
});

app.post('/api/working/:twinId', (req, res) => {
  const { twinId } = req.params;
  const { currentTask, focus = [], context = {} } = req.body;

  const workingContext: WorkingContext = {
    twinId,
    currentTask,
    focus,
    context,
    activeItems: items.get(twinId) || [],
    pending: [],
  };

  contexts.set(twinId, workingContext);
  res.json({ success: true, context: workingContext });
});

app.get('/api/working/:twinId', (req, res) => {
  const { twinId } = req.params;
  cleanupExpired(twinId);
  const context = contexts.get(twinId) || { twinId, focus: [], context: {}, activeItems: [], pending: [] };
  res.json({ success: true, context });
});

app.post('/api/working/:twinId/push', (req, res) => {
  const { twinId } = req.params;
  const { key, value, priority = 5, ttl = DEFAULT_TTL } = req.body;

  if (!key) return res.status(400).json({ error: 'key is required' });

  cleanupExpired(twinId);
  const twinItems = items.get(twinId) || [];

  const item: MemoryItem = {
    id: generateId('item'),
    key,
    value,
    priority,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + ttl).toISOString(),
  };

  twinItems.push(item);
  twinItems.sort((a, b) => b.priority - a.priority);
  items.set(twinId, twinItems);

  res.json({ success: true, item });
});

app.post('/api/working/:twinId/pop', (req, res) => {
  const { twinId } = req.params;
  const twinItems = items.get(twinId) || [];

  if (twinItems.length === 0) {
    return res.json({ success: true, item: null });
  }

  const item = twinItems.pop()!;
  items.set(twinId, twinItems);

  res.json({ success: true, item });
});

app.delete('/api/working/:twinId', (req, res) => {
  const { twinId } = req.params;
  contexts.delete(twinId);
  items.delete(twinId);
  res.json({ success: true });
});

app.get('/api/working/:twinId/items', (req, res) => {
  const { twinId } = req.params;
  cleanupExpired(twinId);
  const twinItems = items.get(twinId) || [];
  res.json({ success: true, items: twinItems, count: twinItems.length });
});

app.listen(PORT, () => {
  console.log(`💭 Twin Working Memory v1.0.0 running on port ${PORT}`);
});

export default app;
